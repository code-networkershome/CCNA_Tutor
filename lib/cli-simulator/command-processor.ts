import { CLIState } from '@/types';
import { CLIResponse } from './ai-interpreter'; // We'll eventually move this type or refactor
import { COMMAND_GRAMMAR, CommandNode, CLIContext } from './grammar';
import * as StateEngine from './state-engine';

// ==========================================
// COMMAND PROCESSOR
// ==========================================

export async function processCommand(state: CLIState, input: string): Promise<CLIResponse> {
    const trimmedInput = input.trim();
    if (!trimmedInput) return { valid: true, output: '' };

    const tokens = trimmedInput.split(/\s+/);
    const command = tokens[0].toLowerCase();

    // 1. Get Grammar for Current Mode
    const currentMode = state.mode as CLIContext;
    const modeGrammar = COMMAND_GRAMMAR[currentMode];

    if (!modeGrammar) {
        return {
            valid: false,
            output: `% Error: No grammar defined for mode ${currentMode}`,
            error: 'System Error: Missing grammar'
        };
    }

    // 2. Traverse Grammar Tree
    let currentNode: CommandNode | undefined;
    let accumulatedArgs: Record<string, string> = {};
    let matchedPath: string[] = [];

    // Root lookup
    // Handle exact match or alias
    // We need to iterate tokens and walk the tree

    let rootNode = findMatchingNode(modeGrammar, tokens[0]);
    if (!rootNode) {
        return {
            valid: false,
            output: `% Invalid input detected at '^' marker.`,
            error: 'Invalid command'
        };
    }

    currentNode = rootNode;
    matchedPath.push(tokens[0]);

    // Walk children
    for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i];
        if (!currentNode.children) {
            // Unnecessary arguments provided
            return {
                valid: false,
                output: `% Invalid input detected at '^' marker.`,
                error: 'Too many arguments'
            };
        }

        const childNode = findMatchingNode(currentNode.children, token);
        if (!childNode) {
            return {
                valid: false,
                output: `% Invalid input detected at '^' marker.`,
                error: 'Invalid argument'
            };
        }

        // Capture argument if applicable
        if (childNode.isArgument && childNode.argName) {
            accumulatedArgs[childNode.argName] = token;
        }

        currentNode = childNode;
        matchedPath.push(token);
    }

    // 3. Execution (Post-Traversal)

    // Check if we ended on a complete command (leaf or valid node)
    // For now, assume if we matched something it is valid, unless specific node requires more args?
    // TODO: Add 'isTerminal' to grammar if needed. For now, check if children exist that correspond to required args.

    if (currentNode.children) {
        // If children exist, check if any are NOT arguments (keywords). 
        // If next is keyword, command is likely incomplete.
        // If next is argument matching, it might be incomplete too.
        // Simplification: returns "Incomplete command" if children exist
        // Refinement: Some commands are valid AND have optional children (e.g. 'shutdown').
        // We need a 'isValidEndpoint' or similar in grammar. 
        // For now, let's execute loose matching logic or check specific cases.
    }

    // EXECUTE SPECIFIC LOGIC BASED ON PATH
    // This switch is a temporary monolithic mapping. 
    // Ideally, handlers should be attached to Grammar Nodes or separate lookup.

    const fullCommand = matchedPath.join(' ').toLowerCase();
    const args = accumulatedArgs; // { ip: '...', mask: '...' }

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

            const next = StateEngine.configureVlan(state, vlanId); // Ensure created
            const final = StateEngine.transitionMode(next, 'vlan_config');
            final.modeHistory = [...state.modeHistory, 'global_config'];
            newState = final;
        }
        else if (fullCommand.startsWith('ip route')) {
            if (args.network && args.mask && args.nexthop) {
                // Validation
                if (!isValidIp(args.network) || !isValidIp(args.mask)) return ErrorResponse('Invalid IP/Mask');
                newState = StateEngine.addStaticRoute(state, args.network, args.mask, args.nexthop);
            } else {
                return ErrorResponse('% Incomplete command.');
            }
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
                // For now silent, maybe add "% Link-5-CHANGED: Interface X, changed state to up" log?
            }
        }
        else if (fullCommand === 'shutdown' || fullCommand === 'shut') {
            if (state.currentInterface) {
                newState = StateEngine.setInterfaceStatus(state, state.currentInterface, 'administratively down');
            }
        }
    }
    // --- VLAN CONFIG ---
    else if (state.mode === 'vlan_config') {
        if (args.name && tokens[0] === 'name') {
            // We need to know WHICH vlan we are editing.
            // Limitation in strict state: we passed mode but lost context unless we track 'currentVlan'?
            // Logic gap: 'state.currentVlan' is needed in CLIState strictly, but for now we look at last accessed?
            // Let's iterate vlans to find the one we just entered?
            // Better: update StateEngine to require VlanID.
            // WORKAROUND: check recent History or assume last one.
            if (state.vlans.length > 0) {
                // Update the last one (assumed active)
                // ideally, add 'currentConfigContext' to state
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

function findMatchingNode(grammar: Record<string, CommandNode>, token: string): CommandNode | undefined {
    // 1. Direct match
    if (grammar[token]) return grammar[token];
    if (grammar[token.toLowerCase()]) return grammar[token.toLowerCase()];

    // 2. Argument match (look for <...>)
    const argKey = Object.keys(grammar).find(k => grammar[k].isArgument);
    if (argKey) return grammar[argKey];

    return undefined;
}

function ErrorResponse(msg: string): CLIResponse {
    return { valid: false, output: msg, error: msg };
}

function isValidIp(ip: string): boolean {
    const parts = ip.split('.');
    return parts.length === 4 && parts.every(p => !isNaN(parseInt(p)) && parseInt(p) >= 0 && parseInt(p) <= 255);
}

function normalizeInterfaceName(input: string): string {
    const lower = input.toLowerCase();
    if (lower.startsWith('g')) return `GigabitEthernet${input.substring(1).replace(/[a-zA-Z]/g, '')}`; // Simplified
    if (lower.startsWith('f')) return `FastEthernet${input.substring(1).replace(/[a-zA-Z]/g, '')}`;
    return input; // Fallback
}

function generateShowOutput(state: CLIState, args: Record<string, string>, fullCmd: string): string {
    if (fullCmd.includes('ip int') || fullCmd.includes('ip interface')) {
        // Show IP Interface Brief
        let out = 'Interface              IP-Address      OK? Method Status                Protocol\n';
        Object.entries(state.interfaces).forEach(([name, data]) => {
            const padding = ' '.repeat(Math.max(1, 22 - name.length));
            const ipPad = ' '.repeat(Math.max(1, 15 - (data.ip || 'unassigned').length));
            out += `${name}${padding}${data.ip || 'unassigned'}${ipPad} YES manual ${data.status} ${data.status === 'up' ? 'up' : 'down'}\n`;
        });
        return out;
    }
    if (fullCmd.includes('running-config') || fullCmd.includes('run')) {
        // Simple config dump
        let out = `Building configuration...\n\nCurrent configuration : 1024 bytes\n!\nversion 15.1\nhostname ${state.hostname}\n!\n`;
        Object.entries(state.interfaces).forEach(([name, data]) => {
            out += `interface ${name}\n`;
            if (data.ip && data.ip !== 'unassigned') out += ` ip address ${data.ip} ${data.mask}\n`;
            if (data.status === 'administratively down') out += ` shutdown\n`;
            out += `!\n`;
        });

        // VLANs
        state.vlans?.forEach(v => {
            out += `vlan ${v.id}\n name ${v.name}\n!\n`;
        });

        // Routes
        state.routes?.filter(r => r.type === 'static').forEach(r => {
            out += `ip route ${r.network} ${r.mask} ${r.nextHop}\n`;
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
        let out = "Codes: C - connected, S - static\n\nGateway of last resort is not set\n\n";
        state.routes.forEach(r => {
            if (r.type === 'connected') {
                out += `C    ${r.network}/${countBits(r.mask)} is directly connected, ${r.nextHop}\n`;
            } else {
                out += `S    ${r.network}/${countBits(r.mask)} [1/0] via ${r.nextHop}\n`;
            }
        });
        return out;
    }
    return "";
}

function countBits(mask: string): number {
    return mask.split('.').map(Number).map(n => n.toString(2).replace(/0/g, '').length).reduce((a, b) => a + b, 0);
}
