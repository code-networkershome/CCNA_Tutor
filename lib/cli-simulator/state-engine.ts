import { CLIState } from '@/types';

// ==========================================
// STATE ENGINE: PURE FUNCTIONS FOR MUTATION
// ==========================================

/**
 * Creates a deep copy of the state to ensure immutability
 */
export function cloneState(state: CLIState): CLIState {
    return JSON.parse(JSON.stringify(state));
}

/**
 * Update the device hostname
 */
export function updateHostname(state: CLIState, newHostname: string): CLIState {
    const nextState = cloneState(state);
    nextState.hostname = newHostname;

    // Update prompt based on new hostname and current mode
    // Note: prompt update logic should probably be centralized, but basic sync here is good
    const modeChar = getModePromptChar(nextState.mode);
    nextState.prompt = `${newHostname}${modeChar}`;

    return nextState;
}

/**
 * Transition strict CLI modes
 */
export function transitionMode(state: CLIState, newMode: CLIState['mode']): CLIState {
    const nextState = cloneState(state);

    // Handle mode history/stacking logic if needed?
    // For now, simple transition. The Processor will handle the "exit" validation logic.
    nextState.mode = newMode;

    // Update prompt
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

    // Clear context if leaving specific modes
    if (newMode !== 'interface_config') nextState.currentInterface = undefined;

    return nextState;
}

function getModePromptChar(mode: CLIState['mode']): string {
    return mode === 'user' ? '>' : '#';
}

/**
 * Configure Interface IP Address
 */
export function setInterfaceIp(state: CLIState, ifaceName: string, ip: string, mask: string): CLIState {
    const nextState = cloneState(state);

    // Normalize interface name
    // (Assuming tokenizer normalized it, but safety check)
    // We will assume the processor passes the exact key for now or we match case-insensitive
    const targetIface = Object.keys(nextState.interfaces).find(k => k.toLowerCase() === ifaceName.toLowerCase());

    if (targetIface && nextState.interfaces[targetIface]) {
        nextState.interfaces[targetIface].ip = ip;
        nextState.interfaces[targetIface].mask = mask;

        // Auto-add connected route
        // Logic: Calculate network address based on IP/Mask
        // Remove old connected route for this interface
        // Add new connected route

        const network = calculateNetworkAddress(ip, mask);

        // Remove old connected route for this interface
        nextState.routes = nextState.routes.filter(r => r.nextHop !== targetIface);

        // Add new
        nextState.routes.push({
            network,
            mask,
            nextHop: targetIface,
            type: 'connected'
        });
    }

    return nextState;
}

/**
 * Set Interface Status (no shut / shutdown)
 */
export function setInterfaceStatus(state: CLIState, ifaceName: string, status: 'up' | 'administratively down'): CLIState {
    const nextState = cloneState(state);
    const targetIface = Object.keys(nextState.interfaces).find(k => k.toLowerCase() === ifaceName.toLowerCase());

    if (targetIface && nextState.interfaces[targetIface]) {
        nextState.interfaces[targetIface].status = status;

        // If interface goes down, remove connected route?
        // Real IOS behavior: connected route only exists if Line Protocol is UP.
        // For simulation simplicity: if admin down, remove connected route.
        if (status === 'administratively down') {
            nextState.routes = nextState.routes.filter(r => r.nextHop !== targetIface);
        } else {
            // Restore connected route if IP exists
            const iface = nextState.interfaces[targetIface];
            if (iface.ip && iface.mask && iface.ip !== 'unassigned') {
                const network = calculateNetworkAddress(iface.ip, iface.mask);
                // Check redundancy
                const exists = nextState.routes.some(r => r.nextHop === targetIface && r.network === network);
                if (!exists) {
                    nextState.routes.push({
                        network,
                        mask: iface.mask,
                        nextHop: targetIface,
                        type: 'connected'
                    });
                }
            }
        }
    }

    return nextState;
}

/**
 * Create or Update VLAN
 */
export function configureVlan(state: CLIState, vlanId: number, name?: string): CLIState {
    const nextState = cloneState(state);

    // Ensure VLANs array exists
    if (!nextState.vlans) nextState.vlans = [];

    const existingIndex = nextState.vlans.findIndex(v => v.id === vlanId);

    if (existingIndex >= 0) {
        // Update existing
        if (name) nextState.vlans[existingIndex].name = name;
    } else {
        // Create new
        nextState.vlans.push({
            id: vlanId,
            name: name || `VLAN${vlanId.toString().padStart(4, '0')}`,
            ports: []
        });
        // Sort VLANs by ID
        nextState.vlans.sort((a, b) => a.id - b.id);
    }

    return nextState;
}

/**
 * Add Static Route
 */
export function addStaticRoute(state: CLIState, network: string, mask: string, nextHop: string): CLIState {
    const nextState = cloneState(state);
    if (!nextState.routes) nextState.routes = [];

    // Idempotency check
    const exists = nextState.routes.some(r => r.network === network && r.mask === mask && r.nextHop === nextHop);
    if (!exists) {
        nextState.routes.push({
            network,
            mask,
            nextHop,
            type: 'static'
        });
    }

    return nextState;
}

// ============ HELPER FUNCTIONS ============

function calculateNetworkAddress(ip: string, mask: string): string {
    const ipOctets = ip.split('.').map(Number);
    const maskOctets = mask.split('.').map(Number);

    const networkOctets = ipOctets.map((octet, i) => octet & maskOctets[i]);
    return networkOctets.join('.');
}
