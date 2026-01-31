import { CLIState } from '@/types';

// ==========================================
// STATE ENGINE: PURE FUNCTIONS FOR MUTATION
// ==========================================

export function cloneState(state: CLIState): CLIState {
    return JSON.parse(JSON.stringify(state));
}

export function updateHostname(state: CLIState, newHostname: string): CLIState {
    const nextState = cloneState(state);
    nextState.hostname = newHostname;
    const modeChar = getModePromptChar(nextState.mode);
    nextState.prompt = `${newHostname}${modeChar}`;
    return nextState;
}

export function transitionMode(state: CLIState, newMode: CLIState['mode']): CLIState {
    const nextState = cloneState(state);
    nextState.mode = newMode;
    const modeChar = getModePromptChar(newMode);
    let promptPrefix = nextState.hostname;

    switch (newMode) {
        case 'global_config': promptPrefix += '(config)'; break;
        case 'interface_config': promptPrefix += '(config-if)'; break;
        case 'router_config': promptPrefix += '(config-router)'; break;
        case 'line_config': promptPrefix += '(config-line)'; break;
        case 'vlan_config': promptPrefix += '(config-vlan)'; break;
        case 'dhcp_config': promptPrefix += '(dhcp-config)'; break;
        case 'acl_config': promptPrefix += '(config-ext-nacl)'; break;
    }

    nextState.prompt = `${promptPrefix}${modeChar}`;
    if (newMode !== 'interface_config') nextState.currentInterface = undefined;

    return nextState;
}

function getModePromptChar(mode: CLIState['mode']): string {
    return mode === 'user' ? '>' : '#';
}

// ============ INTERFACE CONFIG ============

export function setInterfaceIp(state: CLIState, ifaceName: string, ip: string, mask: string): CLIState {
    const nextState = cloneState(state);
    const targetIface = Object.keys(nextState.interfaces).find(k => k.toLowerCase() === ifaceName.toLowerCase());

    if (targetIface && nextState.interfaces[targetIface]) {
        nextState.interfaces[targetIface].ip = ip;
        nextState.interfaces[targetIface].mask = mask;
        return calculateRoutingTable(nextState);
    }
    return nextState;
}

export function setInterfaceStatus(state: CLIState, ifaceName: string, status: 'up' | 'administratively down'): CLIState {
    const nextState = cloneState(state);
    const targetIface = Object.keys(nextState.interfaces).find(k => k.toLowerCase() === ifaceName.toLowerCase());

    if (targetIface && nextState.interfaces[targetIface]) {
        nextState.interfaces[targetIface].status = status;
        return calculateRoutingTable(nextState);
    }
    return nextState;
}

// ============ VLAN CONFIG ============

export function configureVlan(state: CLIState, vlanId: number, name?: string): CLIState {
    const nextState = cloneState(state);
    if (!nextState.vlans) nextState.vlans = [];

    const existingIndex = nextState.vlans.findIndex(v => v.id === vlanId);

    if (existingIndex >= 0) {
        if (name) nextState.vlans[existingIndex].name = name;
    } else {
        nextState.vlans.push({
            id: vlanId,
            name: name || `VLAN${vlanId.toString().padStart(4, '0')}`,
            ports: []
        });
        nextState.vlans.sort((a, b) => a.id - b.id);
    }
    return nextState;
}

// ============ STATIC ROUTING ============

export function addStaticRoute(state: CLIState, network: string, mask: string, nextHop: string): CLIState {
    const nextState = cloneState(state);
    if (!nextState.staticRoutes) nextState.staticRoutes = [];

    // Idempotency
    const exists = nextState.staticRoutes.some(r => r.network === network && r.mask === mask && r.nextHop === nextHop);
    if (!exists) {
        nextState.staticRoutes.push({ network, mask, nextHop });
    }
    return calculateRoutingTable(nextState);
}

export function removeStaticRoute(state: CLIState, network: string, mask: string, nextHop: string): CLIState {
    const nextState = cloneState(state);
    if (nextState.staticRoutes) {
        nextState.staticRoutes = nextState.staticRoutes.filter(r => !(r.network === network && r.mask === mask && r.nextHop === nextHop));
    }
    return calculateRoutingTable(nextState);
}

// ============ DYNAMIC ROUTING (RIP/OSPF) ============

export function configureRip(state: CLIState): CLIState {
    const nextState = cloneState(state);
    if (!nextState.ripConfig) {
        nextState.ripConfig = { version: 2, networks: [], autoSummary: false };
    }
    return nextState;
}

export function addRipNetwork(state: CLIState, network: string): CLIState {
    const nextState = cloneState(state);
    if (nextState.ripConfig && !nextState.ripConfig.networks.includes(network)) {
        nextState.ripConfig.networks.push(network);
    }
    return calculateRoutingTable(nextState);
}

export function configureOspf(state: CLIState, processId: number): CLIState {
    const nextState = cloneState(state);
    if (!nextState.ospfConfig) {
        nextState.ospfConfig = { processId, networks: [] };
    } else if (nextState.ospfConfig.processId !== processId) {
        // Switch process? For now just overwrite or update ID (simplified)
        nextState.ospfConfig.processId = processId;
    }
    return nextState;
}

export function addOspfNetwork(state: CLIState, network: string, wildcard: string, area: number): CLIState {
    const nextState = cloneState(state);
    if (nextState.ospfConfig) {
        const exists = nextState.ospfConfig.networks.some(n => n.network === network && n.wildcard === wildcard && n.area === area);
        if (!exists) {
            nextState.ospfConfig.networks.push({ network, wildcard, area });
        }
    }
    return calculateRoutingTable(nextState);
}

// ============ ROUTING TABLE CALCULATION ============

export function calculateRoutingTable(state: CLIState): CLIState {
    // 1. Reset Active Routes
    const newRoutes: CLIState['routes'] = [];
    const connectedSubnets: Array<{ net: string, mask: string, iface: string }> = [];

    // 2. Connected Routes (AD 0)
    // Only if Status is UP and IP is valid
    Object.entries(state.interfaces).forEach(([name, iface]) => {
        if (iface.status === 'up' && iface.ip && iface.ip !== 'unassigned' && iface.mask) {
            const network = calculateNetworkAddress(iface.ip, iface.mask);
            newRoutes.push({
                network,
                mask: iface.mask,
                nextHop: name, // specific format for connected
                type: 'connected'
            });
            connectedSubnets.push({ net: network, mask: iface.mask, iface: name });
        }
    });

    // 3. Static Routes (AD 1)
    // Only if Next Hop is reachable (recursive lookup) or generic persistence (simplified for CCNA)
    // Packet Tracer Logic: Static route installs if interface is UP.
    // We will assume "always install" if interface implies it, or just install it (Standard behavior)
    // Better: Check if nextHop matches any connected subnet OR is an interface name (not supported in our struct yet)
    state.staticRoutes?.forEach(r => {
        // Validity check: Is nextHop on a connected subnet?
        // const isReachable = connectedSubnets.some(sub => isIpInSubnet(r.nextHop, sub.net, sub.mask));
        // For simplicity: Install it. IOS installs static routes pointing to interfaces always. 
        // Pointing to IP requires reachability. We'll skip complex check for now.
        newRoutes.push({
            network: r.network,
            mask: r.mask,
            nextHop: r.nextHop,
            type: 'static'
        });
    });

    // 4. Dynamic (RIP - AD 120, OSPF - AD 110)
    // MOCK INJECTION: If any interface matches a network statement, inject a "Learned" route

    // RIP
    if (state.ripConfig && state.ripConfig.networks.length > 0) {
        // Check if any connected subnet is covered by RIP network
        const isRipActive = connectedSubnets.some(sub => {
            // Simplified: does rip config network equal subnet? or partial match?
            // RIP 'network' command is classful usually, but let's assume exact or class match.
            // We'll simplistic check: if rip configs has the subnet network string
            return state.ripConfig!.networks.includes(sub.net);
            // Better: 'network 10.0.0.0' matches '10.1.1.0/24'. 
            // We'll skip complex classful matching. User usually types classful.
        });

        if (isRipActive) {
            // Inject Mock Route
            newRoutes.push({
                network: '192.168.100.0',
                mask: '255.255.255.0',
                nextHop: '10.1.1.2', // Mock neighbor
                type: 'rip'
            });
        }
    }

    // OSPF
    if (state.ospfConfig && state.ospfConfig.networks.length > 0) {
        // Check activation
        // OSPF uses wildcard matching. 
        // Simplified check: exact match of network/wildcard logic is hard without helper.
        // We act if any network is present.

        newRoutes.push({
            network: '172.16.1.0',
            mask: '255.255.255.0',
            nextHop: '10.1.1.2',
            type: 'ospf'
        });
    }

    state.routes = newRoutes;
    return state;
}

// ============ HELPERS ============

function calculateNetworkAddress(ip: string, mask: string): string {
    const ipOctets = ip.split('.').map(Number);
    const maskOctets = mask.split('.').map(Number);
    const networkOctets = ipOctets.map((octet, i) => octet & maskOctets[i]);
    return networkOctets.join('.');
}
