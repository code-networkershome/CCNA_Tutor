import Groq from 'groq-sdk';
import type { CLIState } from '@/types';

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export interface CLIResponse {
    valid: boolean;
    output: string;
    modeChange?: 'user' | 'privileged' | 'global_config' | 'interface_config' | 'router_config' | 'line_config' | 'dhcp_config' | 'vlan_config' | 'acl_config';
    hostnameChange?: string;
    error?: string;
}

// ========== VALIDATION FUNCTIONS ==========

/**
 * Validates an IP address (IPv4)
 * @returns true if valid, false otherwise
 */
function isValidIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    for (const part of parts) {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 0 || num > 255 || part !== num.toString()) {
            return false;
        }
    }
    return true;
}

/**
 * Validates a subnet mask
 * @returns true if valid, false otherwise
 */
function isValidSubnetMask(mask: string): boolean {
    // First check basic IP format
    if (!isValidIPv4(mask)) return false;

    // Valid subnet masks (common ones)
    const validMasks = [
        '0.0.0.0', '128.0.0.0', '192.0.0.0', '224.0.0.0', '240.0.0.0',
        '248.0.0.0', '252.0.0.0', '254.0.0.0', '255.0.0.0', '255.128.0.0',
        '255.192.0.0', '255.224.0.0', '255.240.0.0', '255.248.0.0',
        '255.252.0.0', '255.254.0.0', '255.255.0.0', '255.255.128.0',
        '255.255.192.0', '255.255.224.0', '255.255.240.0', '255.255.248.0',
        '255.255.252.0', '255.255.254.0', '255.255.255.0', '255.255.255.128',
        '255.255.255.192', '255.255.255.224', '255.255.255.240',
        '255.255.255.248', '255.255.255.252', '255.255.255.254', '255.255.255.255'
    ];
    return validMasks.includes(mask);
}

/**
 * Pre-validates IP-related commands before sending to LLM
 * Returns an error response if validation fails, null if command passes validation
 */
function preValidateCommand(command: string): CLIResponse | null {
    const lowerCommand = command.toLowerCase().trim();

    // Check for "ip address" command
    const ipAddressMatch = command.match(/ip\s+add(?:ress)?\s+(\S+)\s+(\S+)/i);
    if (ipAddressMatch) {
        const [, ipAddress, subnetMask] = ipAddressMatch;

        // Validate IP address
        if (!isValidIPv4(ipAddress)) {
            return {
                valid: false,
                output: `% Invalid IP address: ${ipAddress}`,
                error: 'Invalid IPv4 address format'
            };
        }

        // Validate subnet mask
        if (!isValidSubnetMask(subnetMask)) {
            return {
                valid: false,
                output: `% Invalid input detected at '${subnetMask}'.\n% Bad mask /xx for address ${ipAddress}`,
                error: 'Invalid subnet mask'
            };
        }
    }

    // Check for other IP-related commands (static routes, ACLs, etc.)
    const staticRouteMatch = command.match(/ip\s+route\s+(\S+)\s+(\S+)/i);
    if (staticRouteMatch) {
        const [, network, mask] = staticRouteMatch;
        if (!isValidIPv4(network)) {
            return {
                valid: false,
                output: `% Invalid network address: ${network}`,
                error: 'Invalid IPv4 network address'
            };
        }
        if (!isValidSubnetMask(mask)) {
            return {
                valid: false,
                output: `% Invalid input detected at '${mask}'.`,
                error: 'Invalid subnet mask'
            };
        }
    }

    return null; // Command passes validation
}

const SYSTEM_PROMPT = `You are a Cisco IOS CLI simulator for CCNA training. You must respond exactly like a real Cisco router or switch would.

CURRENT DEVICE STATE:
- Device type: {deviceType}
- Current mode: {mode}
- Hostname: {hostname}

MODES AND PROMPTS:
- user: hostname>
- privileged: hostname#
- global_config: hostname(config)#
- interface_config: hostname(config-if)#
- router_config: hostname(config-router)#
- line_config: hostname(config-line)#
- dhcp_config: hostname(dhcp-config)#
- vlan_config: hostname(config-vlan)#

RULES:
1. Only allow commands valid for the current mode
2. Support all Cisco IOS abbreviations (en=enable, conf t=configure terminal, sh=show, int=interface, etc.)
3. Generate realistic output for show commands
4. For configuration commands, acknowledge silently (empty output) unless there's an error
5. Return proper error messages for invalid commands: "% Invalid input detected" or "% Incomplete command."
6. Understand interface naming: g0/0, gi0/0, GigabitEthernet0/0, s0/0/0, Serial0/0/0, fa0/1, FastEthernet0/1, lo0, Loopback0, vlan1, etc.
7. IMPORTANT: Validate IP addresses (each octet 0-255) and subnet masks before accepting configuration commands

RESPOND WITH VALID JSON ONLY (no markdown, no explanation):
{
    "valid": true/false,
    "output": "the command output or empty string",
    "modeChange": "new_mode_name" or null,
    "hostnameChange": "new_hostname" or null,
    "error": "error message" or null
}

EXAMPLES:

Command: "enable" in user mode
{"valid":true,"output":"","modeChange":"privileged","hostnameChange":null,"error":null}

Command: "conf t" in privileged mode
{"valid":true,"output":"Enter configuration commands, one per line. End with CNTL/Z.","modeChange":"global_config","hostnameChange":null,"error":null}

Command: "hostname R1" in global_config mode
{"valid":true,"output":"","modeChange":null,"hostnameChange":"R1","error":null}

Command: "int g0/0" in global_config mode
{"valid":true,"output":"","modeChange":"interface_config","hostnameChange":null,"error":null}

Command: "show run" in user mode
{"valid":false,"output":"% Invalid input detected","modeChange":null,"hostnameChange":null,"error":"Command requires privileged mode"}

Command: "sh ip int br" in privileged mode
{"valid":true,"output":"Interface              IP-Address      OK? Method Status                Protocol\\nGigabitEthernet0/0     unassigned      YES unset  administratively down down\\nGigabitEthernet0/1     unassigned      YES unset  administratively down down\\nSerial0/0/0            unassigned      YES unset  administratively down down","modeChange":null,"hostnameChange":null,"error":null}`;

export async function interpretCommand(
    state: CLIState,
    command: string
): Promise<CLIResponse> {
    // Pre-validate IP addresses and subnet masks BEFORE sending to LLM
    const validationError = preValidateCommand(command);
    if (validationError) {
        return validationError;
    }

    const modeNames: Record<string, string> = {
        user: 'User EXEC mode (Router>)',
        privileged: 'Privileged EXEC mode (Router#)',
        global_config: 'Global Configuration mode (Router(config)#)',
        interface_config: 'Interface Configuration mode (Router(config-if)#)',
        router_config: 'Router Configuration mode (Router(config-router)#)',
        line_config: 'Line Configuration mode (Router(config-line)#)',
        dhcp_config: 'DHCP Pool Configuration mode (Router(dhcp-config)#)',
        vlan_config: 'VLAN Configuration mode (Router(config-vlan)#)',
    };

    const systemPrompt = SYSTEM_PROMPT
        .replace('{deviceType}', state.device || 'router')
        .replace('{mode}', modeNames[state.mode] || state.mode)
        .replace('{hostname}', state.hostname);

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Command: "${command}"` },
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
            max_tokens: 1024,
            response_format: { type: 'json_object' },
        });

        const responseText = completion.choices[0]?.message?.content || '';

        try {
            const response = JSON.parse(responseText) as CLIResponse;
            return {
                valid: response.valid ?? false,
                output: response.output ?? '',
                modeChange: response.modeChange,
                hostnameChange: response.hostnameChange,
                error: response.error,
            };
        } catch (parseError) {
            // If JSON parsing fails, try to extract useful info
            console.error('Failed to parse LLM response:', responseText);
            return {
                valid: false,
                output: '% Error processing command',
                error: 'Failed to parse response',
            };
        }
    } catch (error) {
        console.error('LLM API error:', error);
        return {
            valid: false,
            output: '% System error - please try again',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
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
    return {
        device: deviceType,
        mode: 'user',
        prompt: `${hostname}>`,
        runningConfig: '',
        hostname,
        interfaces: {},
    };
}
