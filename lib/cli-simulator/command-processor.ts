import { CLIState, NetworkTopology, CLIContext } from '@/types';
import { CLIResponse } from './ai-interpreter';
import { COMMAND_GRAMMAR, CommandNode } from './grammar';
import { resolveCommand } from './command-resolver';
import * as StateEngine from './state-engine';
import * as NetworkSimulator from './network-simulator';

// ==========================================
// COMMAND PROCESSOR
// ==========================================

export async function processCommand(state: CLIState, input: string, context?: { topology: NetworkTopology, deviceId: string }): Promise<CLIResponse> {
    const trimmedInput = input.trim();
    if (!trimmedInput) return { valid: true, output: '' };

    const tokens = trimmedInput.split(/\s+/);

    // 1. Determine Grammar Context (Handle 'do')
    let executionMode = state.mode as CLIContext;
    let effectiveTokens = tokens;

    // Support 'do' in config modes
    if (tokens[0].toLowerCase() === 'do' && state.mode !== 'user' && state.mode !== 'privileged') {
        executionMode = 'privileged';
        effectiveTokens = tokens.slice(1);
        if (effectiveTokens.length === 0) {
            return { valid: false, output: '% Incomplete command.', error: 'Incomplete command' };
        }
    }

    const modeGrammar = COMMAND_GRAMMAR[executionMode];

    if (!modeGrammar) {
        return {
            valid: false,
            output: `% Error: No grammar defined for mode ${executionMode}`,
            error: 'System Error: Missing grammar'
        };
    }

    // 2. Traverse Grammar Tree
    let currentNode: CommandNode | undefined;
    let accumulatedArgs: Record<string, string> = {};
    let matchedPath: string[] = [];

    // Root Resolution
    const rootRes = resolveCommand(modeGrammar, effectiveTokens[0]);

    if (rootRes.type === 'error') {
        return { valid: false, output: rootRes.message, error: 'Invalid command' };
    }
    if (rootRes.type === 'ambiguous') {
        return { valid: false, output: rootRes.message, error: 'Ambiguous command' };
    }

    currentNode = rootRes.node;
    matchedPath.push(rootRes.match); // Store resolved keyword

    // Walk children
    for (let i = 1; i < effectiveTokens.length; i++) {
        const token = effectiveTokens[i];
        if (!currentNode!.children) {
            return {
                valid: false,
                output: `% Invalid input detected at '^' marker.`,
                error: 'Too many arguments'
            };
        }

        const childRes = resolveCommand(currentNode!.children, token);

        if (childRes.type === 'error') {
            return { valid: false, output: childRes.message, error: 'Invalid argument' };
        }
        if (childRes.type === 'ambiguous') {
            return { valid: false, output: childRes.message, error: 'Ambiguous argument' };
        }

        const childNode = childRes.node;

        // Capture argument if applicable
        if (childNode.isArgument && childNode.argName) {
            accumulatedArgs[childNode.argName] = token;
            matchedPath.push(token);
        } else {
            matchedPath.push(childRes.match);
        }

        currentNode = childNode;
    }

    // 3. Execution (Post-Traversal)

    // Execute logic based on matched keys (full resolved command)
    const fullCommand = matchedPath.join(' ').toLowerCase();
    const args = accumulatedArgs;

    let newState = state;
    let output = '';

    // --- GLOBAL ---
    if (fullCommand === 'enable' || fullCommand === 'en') {
        if (state.mode === 'user') {
            newState = StateEngine.transitionMode(state, 'privileged');
        }
    }
    else if (fullCommand === 'exit') {
        if (state.modeHistory.length > 0) {
            const prevMode = state.modeHistory.pop() as any;
            newState = StateEngine.transitionMode(state, prevMode);
            newState.modeHistory = state.modeHistory;
        } else {
            if (state.mode === 'global_config') newState = StateEngine.transitionMode(state, 'privileged');
            else if (state.mode === 'privileged') newState = StateEngine.transitionMode(state, 'user');
            else if (state.mode.includes('config')) newState = StateEngine.transitionMode(state, 'global_config');
        }
    }
    else if (fullCommand === 'conf t' || fullCommand === 'configure terminal') {
        if (state.mode === 'privileged') {
            const next = StateEngine.transitionMode(state, 'global_config');
            next.modeHistory = [...state.modeHistory, 'privileged'];
            newState = next;
        }
    }
    else if (fullCommand === 'end') {
        const next = StateEngine.transitionMode(state, 'privileged');
        next.modeHistory = [];
        next.currentInterface = undefined;
        next.currentRouter = undefined;
        newState = next;
    }
    else if (fullCommand.startsWith('show') || fullCommand.startsWith('sh')) {
        output = generateShowOutput(state, args, fullCommand);
    }
    else if (fullCommand.startsWith('ping') && args.ip) {
        if (context && context.topology && context.deviceId) {
            const res = NetworkSimulator.simulatePing(context.topology, context.deviceId, args.ip);
            output = res.output;
        } else {
            output = `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${args.ip}, timeout is 2 seconds:\n!!!!!\nSuccess rate is 100 percent (5/5)`;
        }
    }
    // --- GLOBAL CONFIG ---
    else if (state.mode === 'global_config') {
        if (args.name && (tokens[0] === 'hostname')) {
            newState = StateEngine.updateHostname(state, args.name);
        }
        else if (args.iface && (tokens[0] === 'interface' || tokens[0] === 'int')) {
            const fullIface = normalizeInterfaceName(args.iface);
            const next = StateEngine.transitionMode(state, 'interface_config');

            // Auto-create interface if it doesn't exist (Dynamic Port Creation)
            if (!next.interfaces[fullIface]) {
                next.interfaces[fullIface] = {
                    status: 'administratively down'
                };
            }

            next.modeHistory = [...state.modeHistory, 'global_config'];
            next.currentInterface = fullIface;
            newState = next;
        }
        else if (args.id && (tokens[0] === 'vlan')) {
            const vlanId = parseInt(args.id);
            if (!isNaN(vlanId)) {
                const next = StateEngine.configureVlan(state, vlanId);
                const final = StateEngine.transitionMode(next, 'vlan_config');
                final.modeHistory = [...state.modeHistory, 'global_config'];
                newState = final;
            } else return ErrorResponse('Invalid VLAN ID');
        }
        else if (fullCommand.startsWith('ip route')) {
            if (args.network && args.mask && args.nexthop) {
                if (isValidIp(args.network) && isValidIp(args.mask)) {
                    newState = StateEngine.addStaticRoute(state, args.network, args.mask, args.nexthop);
                } else return ErrorResponse('Invalid IP/Mask');
            } else return ErrorResponse('% Incomplete command.');
        }
        else if (fullCommand === 'router rip') {
            let next = StateEngine.configureRip(state);
            next = StateEngine.transitionMode(next, 'router_config');
            next.modeHistory = [...state.modeHistory, 'global_config'];
            next.currentRouter = 'rip';
            newState = next;
        }
        else if (args.processId && fullCommand.startsWith('router ospf')) {
            const pid = parseInt(args.processId);
            let next = StateEngine.configureOspf(state, pid);
            next = StateEngine.transitionMode(next, 'router_config');
            next.modeHistory = [...state.modeHistory, 'global_config'];
            next.currentRouter = 'ospf';
            newState = next;
        }
        // New Protocols Global
        else if (fullCommand.startsWith('router eigrp') && args.asNumber) {
            let next = StateEngine.configureEigrp(state, parseInt(args.asNumber));
            next = StateEngine.transitionMode(next, 'router_config');
            next.modeHistory = [...state.modeHistory, 'global_config'];
            next.currentRouter = 'eigrp' as any;
            newState = next;
        }
        else if (fullCommand.startsWith('router bgp') && args.asNumber) {
            let next = StateEngine.configureBgp(state, parseInt(args.asNumber));
            next = StateEngine.transitionMode(next, 'router_config');
            next.modeHistory = [...state.modeHistory, 'global_config'];
            next.currentRouter = 'bgp' as any;
            newState = next;
        }
        else if (fullCommand.startsWith('ip dhcp pool') && args.poolName) {
            let next = StateEngine.configureDhcpPool(state, args.poolName);
            next = StateEngine.transitionMode(next, 'dhcp_config');
            next.modeHistory = [...state.modeHistory, 'global_config'];
            next.currentDhcpPool = args.poolName;
            newState = next;
        }
        else if (fullCommand.startsWith('ip nat inside source static')) {
            if (args.local && args.global) {
                newState = StateEngine.addNatStaticMapping(state, args.local, args.global);
            }
        }
        else if (fullCommand.startsWith('access-list')) {
            if (args.aclId && (fullCommand.includes('permit') || fullCommand.includes('deny'))) {
                const action = fullCommand.includes('permit') ? 'permit' : 'deny';
                const rule = { action, source: args.source, sourceWildcard: args.wildcard };
                newState = StateEngine.addAclRule(state, args.aclId, rule);
            }
        }
        else if (fullCommand.startsWith('spanning-tree mode')) {
            if (fullCommand.includes('rapid-pvst')) newState = StateEngine.configureStpMode(state, 'rapid-pvst');
            else if (fullCommand.includes('pvst')) newState = StateEngine.configureStpMode(state, 'pvst');
        }
    }
    // --- INTERFACE CONFIG ---
    else if (state.mode === 'interface_config') {
        if (fullCommand.includes('ip address') || fullCommand.startsWith('ip add')) {
            if (args.ip && args.mask && state.currentInterface) {
                if (isValidIp(args.ip) && isValidIp(args.mask)) {
                    newState = StateEngine.setInterfaceIp(state, state.currentInterface, args.ip, args.mask);
                } else return ErrorResponse('Invalid IP format');
            }
        }
        else if (fullCommand === 'no shutdown' || fullCommand === 'no shut') {
            if (state.currentInterface) newState = StateEngine.setInterfaceStatus(state, state.currentInterface, 'up');
        }
        else if (fullCommand === 'shutdown' || fullCommand === 'shut') {
            if (state.currentInterface) newState = StateEngine.setInterfaceStatus(state, state.currentInterface, 'administratively down');
        }
        else if (fullCommand.startsWith('description') && state.currentInterface && args.description) {
            const next = StateEngine.cloneState(state);
            if (next.interfaces[state.currentInterface]) {
                next.interfaces[state.currentInterface].description = args.description;
                newState = next;
            }
        }
        else if (fullCommand.startsWith('switchport') && state.currentInterface) {
            if (fullCommand.includes('mode access')) newState = StateEngine.setSwitchportMode(state, state.currentInterface, 'access');
            else if (fullCommand.includes('mode trunk')) newState = StateEngine.setSwitchportMode(state, state.currentInterface, 'trunk');
            else if (fullCommand.includes('access vlan') && args.vlanId) {
                const vlanId = parseInt(args.vlanId);
                if (!isNaN(vlanId)) newState = StateEngine.setAccessVlan(state, state.currentInterface, vlanId);
            }
            else if (fullCommand.includes('port-security')) {
                // Enable
                newState = StateEngine.enablePortSecurity(state, state.currentInterface);
                // Subcommands
                if (fullCommand.includes('maximum') && args.count) {
                    newState = StateEngine.setPortSecurityMax(state, state.currentInterface, parseInt(args.count));
                }
                else if (fullCommand.includes('violation')) {
                    if (fullCommand.includes('protect')) newState = StateEngine.setPortSecurityViolation(state, state.currentInterface, 'protect');
                    else if (fullCommand.includes('restrict')) newState = StateEngine.setPortSecurityViolation(state, state.currentInterface, 'restrict');
                    else if (fullCommand.includes('shutdown')) newState = StateEngine.setPortSecurityViolation(state, state.currentInterface, 'shutdown');
                }
                else if (fullCommand.includes('mac-address')) {
                    if (fullCommand.includes('sticky')) newState = StateEngine.setPortSecuritySticky(state, state.currentInterface);
                    else if (args.mac) newState = StateEngine.addPortSecurityMac(state, state.currentInterface, args.mac);
                }
            }
        }
        else if (fullCommand.startsWith('channel-group') && state.currentInterface && args.channelId) {
            const cid = parseInt(args.channelId);
            let mode: 'on' | 'active' | 'passive' | 'desirable' | 'auto' = 'on';
            if (fullCommand.includes('active')) mode = 'active';
            else if (fullCommand.includes('passive')) mode = 'passive';
            else if (fullCommand.includes('desirable')) mode = 'desirable';
            else if (fullCommand.includes('auto')) mode = 'auto';
            newState = StateEngine.configureChannelGroup(state, state.currentInterface, cid, mode);
        }
        else if (fullCommand === 'ip nat inside' && state.currentInterface) {
            newState = StateEngine.configureNatInside(state, state.currentInterface);
        }
        else if (fullCommand === 'ip nat outside' && state.currentInterface) {
            newState = StateEngine.configureNatOutside(state, state.currentInterface);
        }
    }
    // --- ROUTER CONFIG ---
    else if (state.mode === 'router_config') {
        if (fullCommand.startsWith('network')) {
            if (state.currentRouter === 'rip' && args.network) {
                newState = StateEngine.addRipNetwork(state, args.network);
            }
            else if (state.currentRouter === 'ospf' && args.network && args.wildcard && args.area) {
                newState = StateEngine.addOspfNetwork(state, args.network, args.wildcard, parseInt(args.area));
            }
            else if (state.currentRouter === 'eigrp' && args.network) {
                newState = StateEngine.addEigrpNetwork(state, args.network);
            }
        }
        else if (fullCommand.startsWith('neighbor')) {
            if (state.currentRouter === 'bgp' && args.ip && args.as) {
                newState = StateEngine.addBgpNeighbor(state, args.ip, parseInt(args.as));
            }
        }
        else if (fullCommand.startsWith('version')) {
            if (state.currentRouter === 'rip' && args.version) {
                const ver = parseInt(args.version);
                const next = StateEngine.cloneState(state);
                if (next.ripConfig) next.ripConfig.version = ver;
                newState = next;
            }
        }
        else if (fullCommand === 'no auto-summary') {
            const next = StateEngine.cloneState(state);
            if (state.currentRouter === 'rip' && next.ripConfig) next.ripConfig.autoSummary = false;
            if (state.currentRouter === 'eigrp' && next.eigrpConfig) next.eigrpConfig.noAutoSummary = true;
            newState = next;
        }
    }
    // --- DHCP CONFIG ---
    else if (state.mode === 'dhcp_config' && state.currentDhcpPool) {
        if (fullCommand.startsWith('network') && args.networkIp && args.mask) {
            if (isValidIp(args.networkIp) && isValidIp(args.mask)) {
                newState = StateEngine.setDhcpNetwork(state, state.currentDhcpPool, args.networkIp, args.mask);
            } else return ErrorResponse('Invalid IP/Mask');
        }
        else if (fullCommand.startsWith('default-router') && args.routerIp) {
            if (isValidIp(args.routerIp)) {
                newState = StateEngine.setDhcpDefaultRouter(state, state.currentDhcpPool, args.routerIp);
            } else return ErrorResponse('Invalid IP');
        }
        else if (fullCommand.startsWith('dns-server') && args.dnsIp) {
            if (isValidIp(args.dnsIp)) {
                newState = StateEngine.setDhcpDnsServer(state, state.currentDhcpPool, args.dnsIp);
            } else return ErrorResponse('Invalid IP');
        }
    }
    // --- VLAN CONFIG ---
    else if (state.mode === 'vlan_config') {
        if (args.name && tokens[0] === 'name') {
            if (state.vlans.length > 0) {
                const lastVlan = state.vlans[state.vlans.length - 1];
                newState = StateEngine.configureVlan(state, lastVlan.id, args.name);
            }
        }
    }

    return {
        valid: true,
        output: output,
        newState: newState,
        modeChange: newState.mode !== state.mode ? newState.mode : undefined,
        hostnameChange: newState.hostname !== state.hostname ? newState.hostname : undefined
    };
}

// ============ HELPERS ============

function ErrorResponse(msg: string): CLIResponse {
    return { valid: false, output: msg, error: msg };
}

function isValidIp(ip: string): boolean {
    const parts = ip.split('.');
    return parts.length === 4 && parts.every(p => !isNaN(parseInt(p)) && parseInt(p) >= 0 && parseInt(p) <= 255);
}

function normalizeInterfaceName(input: string): string {
    const lower = input.toLowerCase();
    if (lower.startsWith('po')) return `Port-channel${input.substring(2).replace(/[a-zA-Z]/g, '')}`;
    if (lower.startsWith('vlan')) return `Vlan${input.substring(4).replace(/[a-zA-Z]/g, '')}`;
    if (lower.startsWith('g')) return `GigabitEthernet${input.substring(1).replace(/[a-zA-Z]/g, '')}`;
    if (lower.startsWith('f')) return `FastEthernet${input.substring(1).replace(/[a-zA-Z]/g, '')}`;
    return input;
}

function generateShowOutput(state: CLIState, args: Record<string, string>, fullCmd: string): string {
    if (fullCmd.includes('ip int') || fullCmd.includes('ip interface')) {
        let out = 'Interface              IP-Address      OK? Method Status                Protocol\n';
        Object.entries(state.interfaces).forEach(([name, data]) => {
            const padding = ' '.repeat(Math.max(1, 22 - name.length));
            const ipPad = ' '.repeat(Math.max(1, 15 - (data.ip || 'unassigned').length));
            out += `${name}${padding}${data.ip || 'unassigned'}${ipPad} YES manual ${data.status} ${data.status === 'up' ? 'up' : 'down'}\n`;
        });
        return out;
    }
    if (fullCmd.includes('running-config') || fullCmd.includes('exclude') || fullCmd.includes('run') || fullCmd === 'sh run') {
        let out = `Building configuration...\n\nCurrent configuration : 1024 bytes\n!\nversion 15.1\nhostname ${state.hostname}\n!\n`;
        Object.entries(state.interfaces).forEach(([name, data]) => {
            out += `interface ${name}\n`;
            if (data.ip && data.ip !== 'unassigned') out += ` ip address ${data.ip} ${data.mask}\n`;
            if (data.status === 'administratively down') out += ` shutdown\n`;
            if (data.description) out += ` description ${data.description}\n`;
            out += `!\n`;
        });

        // Dynamic Routing Config Display
        if (state.ripConfig) {
            out += `router rip\n version ${state.ripConfig.version}\n`;
            state.ripConfig.networks.forEach(net => out += ` network ${net}\n`);
            if (!state.ripConfig.autoSummary) out += ` no auto-summary\n`;
            out += `!\n`;
        }
        if (state.ospfConfig) {
            out += `router ospf ${state.ospfConfig.processId}\n`;
            state.ospfConfig.networks.forEach(net => out += ` network ${net.network} ${net.wildcard} area ${net.area}\n`);
            out += `!\n`;
        }

        state.routes?.filter(r => r.type === 'static').forEach(r => {
            out += `ip route ${r.network} ${r.mask} ${r.nextHop}\n`;
        });

        state.vlans?.forEach(v => {
            out += `vlan ${v.id}\n name ${v.name}\n!\n`;
        });

        out += 'end';
        return out;
    }
    if (fullCmd.includes('show vlan') || fullCmd.includes('sh vlan')) {
        let out = 'VLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n';
        state.vlans?.forEach(v => {
            const namePad = ' '.repeat(Math.max(1, 32 - v.name.length));
            out += `${v.id}    ${v.name}${namePad} active    ${v.ports.join(', ')}\n`;
        });
        return out;
    }
    if (fullCmd.includes('ip route')) {
        if (!state.routes || state.routes.length === 0) return "";
        let out = "Codes: C - connected, S - static, R - RIP, O - OSPF\n\nGateway of last resort is not set\n\n";
        state.routes.forEach(r => {
            if (r.type === 'connected') {
                out += `C    ${r.network}/${countBits(r.mask)} is directly connected, ${r.nextHop}\n`;
            } else if (r.type === 'static') {
                out += `S    ${r.network}/${countBits(r.mask)} [1/0] via ${r.nextHop}\n`;
            } else if (r.type === 'rip') {
                out += `R    ${r.network}/${countBits(r.mask)} [120/1] via ${r.nextHop}, 00:00:12, ${r.nextHop === '0.0.0.0' ? 'Serial0/0/0' : 'GigabitEthernet0/0'}\n`;
            } else if (r.type === 'ospf') {
                out += `O    ${r.network}/${countBits(r.mask)} [110/2] via ${r.nextHop}, 00:00:12, GigabitEthernet0/0\n`;
            }
        });
        return out;
    }

    if (fullCmd.includes('ip ospf neighbor')) {
        if (!state.ospfNeighbors || state.ospfNeighbors.length === 0) return "";
        let out = 'Neighbor ID     Pri   State           Dead Time   Address         Interface\n';
        state.ospfNeighbors.forEach(n => {
            const idPad = ' '.repeat(Math.max(1, 15 - n.neighborId.length));
            const pri = n.drPriority.toString().padEnd(6);
            const stateStr = (n.state + '/DR').padEnd(16);
            const dead = `00:00:${n.deadTime.toString().padStart(2, '0')}`.padEnd(12);
            const addr = n.ip.padEnd(16);
            out += `${n.neighborId}${idPad} ${pri}${stateStr}${dead}${addr}${n.interface}\n`;
        });
        return out;
    }
    if (fullCmd.includes('ip eigrp neighbors')) {
        let out = 'H   Address                 Interface       Hold Uptime   SRTT   RTO  Q  Seq\n                                            (sec)         (ms)       Cnt Num\n';
        if (state.eigrpNeighbors) {
            state.eigrpNeighbors.forEach((n, i) => {
                out += `${i}   ${n.ip.padEnd(23)} ${n.interface.padEnd(15)} ${n.holdTime.toString().padEnd(4)} ${n.uptime}   10     100  0  10\n`;
            });
        }
        return out;
        return out;
    }

    if (fullCmd.includes('etherchannel summary')) {
        let out = 'Flags:  D - down        P - bundled in port-channel\n        I - stand-alone s - suspended\n        H - Hot-standby (LACP only)\n        R - Layer3      S - Layer2\n        U - in use      f - failed to allocate aggregator\n\nNumber of channel-groups in use: 1\nNumber of aggregators:           1\n\nGroup  Port-channel  Protocol    Ports\n------+-------------+-----------+-----------------------------------------------\n';
        if (state.etherChannels) {
            Object.entries(state.etherChannels).forEach(([id, grp]) => {
                out += `${id}      Po${id}(SU)     ${grp.protocol.toUpperCase().padEnd(10)} ${grp.members.map(m => m + '(P)').join(' ')}\n`;
            });
        }
        return out;
    }

    if (fullCmd.includes('ip bgp summary')) {
        let out = `BGP router identifier ${state.interfaces['Loopback0']?.ip || '1.1.1.1'}, local AS number ${state.bgpConfig?.asNumber || 65000}\n`;
        out += 'Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd\n';
        if (state.bgpNeighbors) {
            state.bgpNeighbors.forEach(n => {
                out += `${n.ip.padEnd(15)} 4        ${n.remoteAs.toString().padEnd(5)}      10      10        1    0    0 ${n.uptime}  ${n.state === 'Established' ? '1' : n.state}\n`;
            });
        }
        return out;
    }

    if (fullCmd.includes('access-lists')) {
        let out = '';
        if (state.acls) {
            Object.entries(state.acls).forEach(([id, acl]) => {
                out += `${acl.type} IP access list ${id}\n`;
                acl.rules.forEach((r: any) => {
                    out += `    ${r.action} ${r.source} ${r.sourceWildcard || ''}\n`;
                });
            });
        }
        return out;
    }

    if (fullCmd.includes('spanning-tree')) {
        let out = `VLAN0001\n  Spanning tree enabled protocol ${state.stpConfig?.mode || 'ieee'}\n  Root ID    Priority    32769\n             Address     0001.0001.0001\n             This bridge is the root\n`;
        return out;
    }

    return "";
}

function countBits(mask: string): number {
    return mask.split('.').map(Number).map(n => n.toString(2).replace(/0/g, '').length).reduce((a, b) => a + b, 0);
}
