import { CLIState } from '@/types';
import { CLIResponse } from './ai-interpreter';
import { COMMAND_GRAMMAR, CommandNode, CLIContext } from './grammar';
import { resolveCommand } from './command-resolver';
import * as StateEngine from './state-engine';

// ==========================================
// COMMAND PROCESSOR
// ==========================================

export async function processCommand(state: CLIState, input: string): Promise<CLIResponse> {
    const trimmedInput = input.trim();
    if (!trimmedInput) return { valid: true, output: '' };

    const tokens = trimmedInput.split(/\s+/);

    // 1. Determine Grammar Context (Handle 'do')
    let executionMode = state.mode as CLIContext;
    let effectiveTokens = tokens;

    // Support 'do' in config modes
    if (tokens[0] === 'do' && state.mode !== 'user' && state.mode !== 'privileged') {
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
        // Mode history navigation logic
        if (state.modeHistory.length > 0) {
            const prevMode = state.modeHistory.pop() as any; // simplified check
            newState = StateEngine.transitionMode(state, prevMode);
            newState.modeHistory = state.modeHistory; // Ensure history is preserved/updated

            // Fix history: StateEngine returns deep copy, sync history prop
        } else {
            // Fallback
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
    // --- END COMMAND (GLOBAL) ---
    else if (fullCommand === 'end') {
        const next = StateEngine.transitionMode(state, 'privileged');
        next.modeHistory = []; // Clear history
        next.currentInterface = undefined;
        next.currentRouter = undefined;
        newState = next;
    }
    // --- SHOW COMMANDS ---
    else if (fullCommand.startsWith('show') || fullCommand.startsWith('sh')) {
        output = generateShowOutput(state, args, fullCommand);
    }
    // --- GLOBAL CONFIG ---
    else if (state.mode === 'global_config') {
        if (args.name && (tokens[0] === 'hostname')) {
            newState = StateEngine.updateHostname(state, args.name);
        }
        else if (args.iface && (tokens[0] === 'interface' || tokens[0] === 'int')) {
            // Find full interface name
            const fullIface = normalizeInterfaceName(args.iface);
            const next = StateEngine.transitionMode(state, 'interface_config');
            next.modeHistory = [...state.modeHistory, 'global_config'];
            next.currentInterface = fullIface;
            newState = next;
        }
        else if (args.id && (tokens[0] === 'vlan')) {
            const vlanId = parseInt(args.id);
            if (isNaN(vlanId)) return ErrorResponse('Invalid VLAN ID');

            const next = StateEngine.configureVlan(state, vlanId);
            const final = StateEngine.transitionMode(next, 'vlan_config');
            final.modeHistory = [...state.modeHistory, 'global_config'];
            newState = final;
        }
        else if (fullCommand.startsWith('ip route')) {
            if (args.network && args.mask && args.nexthop) {
                if (!isValidIp(args.network) || !isValidIp(args.mask)) return ErrorResponse('Invalid IP/Mask');
                newState = StateEngine.addStaticRoute(state, args.network, args.mask, args.nexthop);
            } else {
                return ErrorResponse('% Incomplete command.');
            }
        }
        // ROUTER RIP
        else if (fullCommand === 'router rip') {
            let next = StateEngine.configureRip(state);
            next = StateEngine.transitionMode(next, 'router_config');
            next.modeHistory = [...state.modeHistory, 'global_config'];
            next.currentRouter = 'rip';
            newState = next;
        }
        // ROUTER OSPF
        else if (args.processId && fullCommand.startsWith('router ospf')) {
            const pid = parseInt(args.processId);
            let next = StateEngine.configureOspf(state, pid);
            next = StateEngine.transitionMode(next, 'router_config');
            next.modeHistory = [...state.modeHistory, 'global_config'];
            next.currentRouter = 'ospf';
            newState = next;
        }
    }
    // --- INTERFACE CONFIG ---
    else if (state.mode === 'interface_config') {
        if (fullCommand.includes('ip address') || fullCommand.startsWith('ip add')) {
            if (args.ip && args.mask && state.currentInterface) {
                if (!isValidIp(args.ip) || !isValidIp(args.mask)) return ErrorResponse('Invalid IP format');
                newState = StateEngine.setInterfaceIp(state, state.currentInterface, args.ip, args.mask);
            } else {
                return ErrorResponse('% Incomplete command.');
            }
        }
        else if (fullCommand === 'no shutdown' || fullCommand === 'no shut') {
            if (state.currentInterface) {
                newState = StateEngine.setInterfaceStatus(state, state.currentInterface, 'up');
            }
        }
        else if (fullCommand === 'shutdown' || fullCommand === 'shut') {
            if (state.currentInterface) {
                newState = StateEngine.setInterfaceStatus(state, state.currentInterface, 'administratively down');
            }
        }
        else if (fullCommand.startsWith('description')) {
            if (state.currentInterface && args.description) {
                const next = StateEngine.cloneState(state);
                if (next.interfaces[state.currentInterface]) {
                    next.interfaces[state.currentInterface].description = args.description;
                    newState = next;
                }
            }
        }
    }
    // --- ROUTER CONFIG (RIP/OSPF) ---
    else if (state.mode === 'router_config') {
        if (fullCommand.startsWith('network')) {
            if (state.currentRouter === 'rip' && args.network) {
                newState = StateEngine.addRipNetwork(state, args.network);
            }
            else if (state.currentRouter === 'ospf' && args.network && args.wildcard && args.area) {
                newState = StateEngine.addOspfNetwork(state, args.network, args.wildcard, parseInt(args.area));
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
            if (state.currentRouter === 'rip') {
                const next = StateEngine.cloneState(state);
                if (next.ripConfig) next.ripConfig.autoSummary = false;
                newState = next;
            }
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
    if (fullCmd.includes('running-config') || fullCmd.includes('run')) {
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
    if (fullCmd.includes('show vlan')) {
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
    return "";
}

function countBits(mask: string): number {
    return mask.split('.').map(Number).map(n => n.toString(2).replace(/0/g, '').length).reduce((a, b) => a + b, 0);
}
