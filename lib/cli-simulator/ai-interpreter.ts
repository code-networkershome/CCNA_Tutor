import Groq from 'groq-sdk';
import type { CLIState } from '@/types';
import { processCommand } from './command-processor';

// Initialize Groq client (Keep only for "Explain" or "Hint" features, NOT for execution)
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export interface CLIResponse {
    valid: boolean;
    output: string;
    modeChange?: 'user' | 'privileged' | 'global_config' | 'interface_config' | 'router_config' | 'line_config' | 'dhcp_config' | 'vlan_config' | 'acl_config';
    hostnameChange?: string;
    error?: string;
    newState?: CLIState; // Full state update (VLANs, Routes, etc.)
}

/**
 * INTERPRET COMMAND (Determinstic Wrapper)
 * Delegates strict execution to the Command Processor.
 * AI is REMOVED from this loop.
 */
export async function interpretCommand(
    state: CLIState,
    command: string
): Promise<CLIResponse> {
    try {
        // Delegate to deterministic processor
        return await processCommand(state, command);
    } catch (error) {
        console.error('CLI Execution Error:', error);
        return {
            valid: false,
            output: '% System error during command execution.',
            error: error instanceof Error ? error.message : 'Unknown error',
            newState: state
        };
    }
}

/**
 * AI Helper for HINTS only (Optional, strictly explicit request)
 */
export async function explainError(command: string, error: string): Promise<string> {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a Cisco CCNA Tutor. Explain this CLI error briefly to a student.' },
                { role: 'user', content: `Command: "${command}"\nError: "${error}"` },
            ],
            model: 'llama-3.1-8b-instant',
            max_tokens: 150,
        });
        return completion.choices[0]?.message?.content || "No explanation available.";
    } catch (e) {
        return "Explanation service unavailable.";
    }
}

// Mode prompt mapping
const MODE_PROMPTS: Record<string, string> = {
    user: '>',
    privileged: '#',
    global_config: '(config)#',
    interface_config: '(config-if)#',
    router_config: '(config-router)#',
    line_config: '(config-line)#',
    dhcp_config: '(dhcp-config)#',
    vlan_config: '(config-vlan)#',
    acl_config: '(config-ext-nacl)#',
};

export function getPrompt(hostname: string, mode: string): string {
    return `${hostname}${MODE_PROMPTS[mode] || '>'}`;
}

export function getInitialState(deviceType: string = 'router', hostname: string = 'Router'): CLIState {
    const initialState: CLIState = {
        device: deviceType,
        mode: 'user',
        prompt: `${hostname}>`,
        runningConfig: '',
        hostname,
        interfaces: {},
        vlans: [],
        routes: [],
        modeHistory: [],
        currentInterface: undefined
    };

    // Initialize default interfaces
    if (deviceType === 'router') {
        initialState.interfaces = {
            'GigabitEthernet0/0': { status: 'administratively down', ip: 'unassigned', mask: 'unknown' },
            'GigabitEthernet0/1': { status: 'administratively down', ip: 'unassigned', mask: 'unknown' },
            'Serial0/0/0': { status: 'administratively down', ip: 'unassigned', mask: 'unknown' }
        };
        // Setup initial routes list (empty)
        initialState.routes = [];
        // Default VLAN
        initialState.vlans = [{ id: 1, name: 'default', ports: [] }];
    } else {
        // Switch interfaces
        for (let i = 1; i <= 24; i++) {
            initialState.interfaces[`FastEthernet0/${i}`] = { status: 'down', ip: 'unassigned', mask: 'unknown' };
        }
        initialState.interfaces['GigabitEthernet0/1'] = { status: 'down', ip: 'unassigned', mask: 'unknown' };
        initialState.interfaces['GigabitEthernet0/2'] = { status: 'down', ip: 'unassigned', mask: 'unknown' };
        initialState.interfaces['Vlan1'] = { status: 'administratively down', ip: 'unassigned', mask: 'unknown' };

        initialState.vlans = [{ id: 1, name: 'default', ports: [] }];
    }

    return initialState;
}
