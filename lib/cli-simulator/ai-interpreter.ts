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
 * Validates an interface name
 */
function isValidInterface(iface: string): boolean {
    // Common interface patterns
    const patterns = [
        /^g(?:i(?:gabitethernet)?)?[0-9]+\/[0-9]+(?:\/[0-9]+)?$/i,
        /^fa(?:stethernet)?[0-9]+\/[0-9]+$/i,
        /^e(?:thernet)?[0-9]+\/[0-9]+$/i,
        /^s(?:erial)?[0-9]+\/[0-9]+(?:\/[0-9]+)?$/i,
        /^lo(?:opback)?[0-9]+$/i,
        /^vlan[0-9]+$/i,
        /^po(?:rt-channel)?[0-9]+$/i,
        /^tu(?:nnel)?[0-9]+$/i,
    ];
    return patterns.some(p => p.test(iface));
}

/**
 * Validates a VLAN ID (1-4094)
 */
function isValidVlanId(vlanId: string): boolean {
    const num = parseInt(vlanId, 10);
    return !isNaN(num) && num >= 1 && num <= 4094;
}

/**
 * Validates OSPF process ID (1-65535)
 */
function isValidOspfProcessId(id: string): boolean {
    const num = parseInt(id, 10);
    return !isNaN(num) && num >= 1 && num <= 65535;
}

/**
 * Validates OSPF area ID (0-4294967295 or dotted decimal)
 */
function isValidOspfArea(area: string): boolean {
    // Numeric area ID
    const num = parseInt(area, 10);
    if (!isNaN(num) && num >= 0 && num <= 4294967295) return true;
    // Dotted decimal area ID
    return isValidIPv4(area);
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

    // Check for static routes
    const staticRouteMatch = command.match(/ip\s+route\s+(\S+)\s+(\S+)\s+(\S+)/i);
    if (staticRouteMatch) {
        const [, network, mask, nextHop] = staticRouteMatch;
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
        // Next hop can be IP or interface
        if (!isValidIPv4(nextHop) && !isValidInterface(nextHop)) {
            return {
                valid: false,
                output: `% Invalid next-hop address or interface: ${nextHop}`,
                error: 'Invalid next-hop'
            };
        }
    }

    // Check for interface command
    const interfaceMatch = command.match(/^int(?:erface)?\s+(\S+)/i);
    if (interfaceMatch && !lowerCommand.startsWith('int ')) {
        // Skip abbreviation "int" for now, validate full form
    }
    if (interfaceMatch) {
        const iface = interfaceMatch[1];
        if (!isValidInterface(iface) && !/^range\s/i.test(iface)) {
            return {
                valid: false,
                output: `% Invalid interface type and target at '${iface}'`,
                error: 'Invalid interface name'
            };
        }
    }

    // Check for VLAN commands
    const vlanMatch = command.match(/vlan\s+(\d+)/i);
    if (vlanMatch) {
        const vlanId = vlanMatch[1];
        if (!isValidVlanId(vlanId)) {
            return {
                valid: false,
                output: `% VLAN ID must be between 1 and 4094`,
                error: 'VLAN ID out of range'
            };
        }
    }

    // Check for switchport access vlan
    const accessVlanMatch = command.match(/switchport\s+access\s+vlan\s+(\d+)/i);
    if (accessVlanMatch) {
        const vlanId = accessVlanMatch[1];
        if (!isValidVlanId(vlanId)) {
            return {
                valid: false,
                output: `% Access VLAN ID must be between 1 and 4094`,
                error: 'VLAN ID out of range'
            };
        }
    }

    // Check for OSPF router command
    const ospfMatch = command.match(/router\s+ospf\s+(\d+)/i);
    if (ospfMatch) {
        const processId = ospfMatch[1];
        if (!isValidOspfProcessId(processId)) {
            return {
                valid: false,
                output: `% OSPF process ID must be between 1 and 65535`,
                error: 'OSPF process ID out of range'
            };
        }
    }

    // Check for OSPF network command
    const ospfNetworkMatch = command.match(/network\s+(\S+)\s+(\S+)\s+area\s+(\S+)/i);
    if (ospfNetworkMatch) {
        const [, network, wildcard, area] = ospfNetworkMatch;
        if (!isValidIPv4(network)) {
            return {
                valid: false,
                output: `% Invalid network address: ${network}`,
                error: 'Invalid network address'
            };
        }
        if (!isValidIPv4(wildcard)) {
            return {
                valid: false,
                output: `% Invalid wildcard mask: ${wildcard}`,
                error: 'Invalid wildcard mask format'
            };
        }
        if (!isValidOspfArea(area)) {
            return {
                valid: false,
                output: `% Invalid OSPF area: ${area}`,
                error: 'Invalid OSPF area ID'
            };
        }
    }

    // Check for default gateway
    const defaultGwMatch = command.match(/ip\s+default-gateway\s+(\S+)/i);
    if (defaultGwMatch) {
        const gateway = defaultGwMatch[1];
        if (!isValidIPv4(gateway)) {
            return {
                valid: false,
                output: `% Invalid gateway address: ${gateway}`,
                error: 'Invalid gateway IP address'
            };
        }
    }

    // Check for access-list (standard)
    const aclMatch = command.match(/access-list\s+(\d+)/i);
    if (aclMatch) {
        const aclNum = parseInt(aclMatch[1], 10);
        // Standard ACLs: 1-99, 1300-1999; Extended: 100-199, 2000-2699
        const validRanges = [
            [1, 99], [100, 199], [1300, 1999], [2000, 2699]
        ];
        const isValid = validRanges.some(([min, max]) => aclNum >= min && aclNum <= max);
        if (!isValid) {
            return {
                valid: false,
                output: `% Invalid access-list number: ${aclNum}.\n% Valid ranges: 1-99, 100-199, 1300-1999, 2000-2699`,
                error: 'Invalid ACL number'
            };
        }
    }

    return null; // Command passes validation
}

/**
 * Validates if a command is allowed in the current mode (like real Cisco IOS)
 * This is critical for realistic CLI simulation
 */
function validateCommandMode(command: string, mode: string): CLIResponse | null {
    const lowerCommand = command.toLowerCase().trim();

    // Commands available in user mode (very limited)
    const userModeCommands = [
        'enable', 'exit', 'logout', 'quit', 'help', '?',
        'ping', 'traceroute', 'telnet', 'ssh',
        'show version', 'show clock', 'show users', 'show sessions',
        'show history', 'terminal'
    ];

    // "show" commands that require at least privileged mode
    const privilegedShowCommands = [
        'show run', 'show start', 'show ip', 'show interface', 'show vlan',
        'show spanning', 'show cdp', 'show lldp', 'show arp', 'show mac',
        'show access', 'show route', 'show protocol', 'show controllers',
        'show flash', 'show boot', 'show logging', 'show ntp', 'show snmp'
    ];

    // Commands only valid in global config mode
    const globalConfigCommands = [
        'hostname', 'enable', 'line', 'interface', 'router', 'ip route',
        'ip default-gateway', 'ip domain', 'ip name-server', 'ip dhcp',
        'access-list', 'ip access-list', 'vlan', 'spanning-tree',
        'service', 'no service', 'logging', 'ntp', 'snmp', 'banner',
        'username', 'crypto', 'key', 'aaa'
    ];

    // Commands only valid in interface config mode
    const interfaceConfigCommands = [
        'ip address', 'no ip address', 'shutdown', 'no shutdown',
        'description', 'speed', 'duplex', 'switchport', 'no switchport',
        'channel-group', 'standby', 'encapsulation', 'bandwidth',
        'clock rate', 'ip helper', 'ip nat', 'ip ospf', 'ip access-group'
    ];

    // Handle "do" command (allows exec commands from config mode)
    if (lowerCommand.startsWith('do ')) {
        if (mode === 'user' || mode === 'privileged') {
            return {
                valid: false,
                output: "% Invalid input detected at '^' marker.\n% 'do' is only valid in configuration modes",
                error: "Invalid command for this mode"
            };
        }
        // Strip "do " and continue - the rest of the command will be processed as privileged mode command
        return null;
    }

    // USER MODE validation
    if (mode === 'user') {
        // Check if it's an allowed user mode command
        const isUserCommand = userModeCommands.some(cmd => lowerCommand.startsWith(cmd));

        // Check for show commands that require privileged mode
        if (lowerCommand.startsWith('sh')) {
            const requiresPrivileged = privilegedShowCommands.some(cmd =>
                lowerCommand.startsWith(cmd.replace('show', 'sh')) ||
                lowerCommand.startsWith(cmd)
            );
            if (requiresPrivileged) {
                return {
                    valid: false,
                    output: "% Invalid input detected at '^' marker.\n\nTranslating \"" + command + "\"\n% Unknown command or computer name, or unable to find computer address",
                    error: "Command requires privileged mode"
                };
            }
        }

        // Check for config commands in user mode
        if (lowerCommand.startsWith('conf') || lowerCommand.startsWith('config')) {
            return {
                valid: false,
                output: "% Invalid input detected at '^' marker.",
                error: "Command requires privileged mode"
            };
        }

        // Check for interface/hostname and other config commands
        if (globalConfigCommands.some(cmd => lowerCommand.startsWith(cmd))) {
            return {
                valid: false,
                output: "% Invalid input detected at '^' marker.",
                error: "Configuration command not valid in User EXEC mode"
            };
        }
    }

    // PRIVILEGED MODE validation
    if (mode === 'privileged') {
        // Config commands are not allowed directly in privileged mode
        if (interfaceConfigCommands.some(cmd => lowerCommand.startsWith(cmd))) {
            return {
                valid: false,
                output: "% Invalid input detected at '^' marker.",
                error: "Command only valid in interface configuration mode"
            };
        }

        // hostname, line, router commands need config mode
        const needsConfigMode = ['hostname', 'line vty', 'line con', 'router ', 'access-list', 'ip access-list', 'ip route'];
        if (needsConfigMode.some(cmd => lowerCommand.startsWith(cmd))) {
            return {
                valid: false,
                output: "% Invalid input detected at '^' marker.",
                error: "Command only valid in global configuration mode"
            };
        }
    }

    // CONFIG MODES - show commands need "do" prefix
    if (mode.includes('config')) {
        // Show commands without "do" prefix are invalid in config modes
        if (lowerCommand.startsWith('sh ') || lowerCommand === 'sh' ||
            lowerCommand.startsWith('show ') || lowerCommand === 'show') {
            return {
                valid: false,
                output: "% Invalid input detected at '^' marker.\n\nUse 'do show ...' to run EXEC commands from configuration mode.",
                error: "In configuration mode, use 'do show ...' for EXEC commands"
            };
        }

        // Ping, traceroute without "do"
        if (lowerCommand.startsWith('ping ') || lowerCommand.startsWith('traceroute ')) {
            return {
                valid: false,
                output: "% Invalid input detected at '^' marker.\n\nUse 'do " + command + "' to run this command from configuration mode.",
                error: "Use 'do' prefix for EXEC commands in config mode"
            };
        }

        // Copy, write commands without "do"
        if (lowerCommand.startsWith('copy ') || lowerCommand.startsWith('write ') || lowerCommand === 'wr') {
            return {
                valid: false,
                output: "% Invalid input detected at '^' marker.\n\nUse 'do " + command + "' to run this command from configuration mode.",
                error: "Use 'do' prefix for EXEC commands in config mode"
            };
        }
    }

    // INTERFACE CONFIG MODE - specific validation
    if (mode === 'interface_config') {
        // Don't allow global config commands in interface mode (except exit/end)
        if (lowerCommand.startsWith('hostname') || lowerCommand.startsWith('router ') ||
            lowerCommand.startsWith('line ') || lowerCommand.startsWith('vlan ')) {
            return {
                valid: false,
                output: "% Invalid input detected at '^' marker.",
                error: "Command not valid in interface configuration mode. Use 'exit' first."
            };
        }
    }

    // GLOBAL CONFIG MODE - interface commands need interface mode
    if (mode === 'global_config') {
        // Interface-specific commands need interface mode
        if (lowerCommand.startsWith('ip address') || lowerCommand.startsWith('switchport') ||
            lowerCommand.startsWith('no shutdown') || lowerCommand === 'shutdown') {
            return {
                valid: false,
                output: "% Invalid input detected at '^' marker.\n\nThis command is only valid in interface configuration mode.\nUse 'interface <name>' first.",
                error: "Command only valid in interface configuration mode"
            };
        }
    }

    return null; // Command passes mode validation
}

const SYSTEM_PROMPT = `You are a STRICT Cisco IOS CLI simulator that behaves EXACTLY like Cisco Packet Tracer. You must simulate real Cisco router/switch behavior precisely.

CURRENT DEVICE STATE:
- Device type: {deviceType}
- Current mode: {mode}
- Hostname: {hostname}

CISCO IOS MODES (CRITICAL - ENFORCE STRICTLY):
1. USER EXEC (hostname>) - Very limited commands: enable, exit, ping (basic), show version, show clock
2. PRIVILEGED EXEC (hostname#) - All show commands, debug, copy, write, reload, configure terminal
3. GLOBAL CONFIG (hostname(config)#) - hostname, interface, line, router, vlan, access-list, ip route
4. INTERFACE CONFIG (hostname(config-if)#) - ip address, shutdown, description, switchport, encapsulation
5. ROUTER CONFIG (hostname(config-router)#) - network, passive-interface, redistribute
6. LINE CONFIG (hostname(config-line)#) - password, login, transport, exec-timeout
7. VLAN CONFIG (hostname(config-vlan)#) - name

MODE TRANSITIONS (MUST BE FOLLOWED):
- enable: user → privileged
- configure terminal (conf t): privileged → global_config
- interface X: global_config → interface_config
- router ospf/eigrp: global_config → router_config
- line vty/con: global_config → line_config
- vlan X: global_config → vlan_config
- exit: go back one level
- end (Ctrl+Z): return to privileged from any config mode

CISCO IOS ABBREVIATIONS (MUST SUPPORT):
- en = enable
- conf t = configure terminal
- sh = show
- int = interface
- fa = FastEthernet
- gi/g = GigabitEthernet
- s = Serial
- lo = Loopback
- no shut = no shutdown
- ip add = ip address
- wr = write memory

SHOW COMMAND OUTPUTS (GENERATE REALISTIC DATA):
For "show ip interface brief" or "sh ip int br":
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     unassigned      YES unset  administratively down down
GigabitEthernet0/1     unassigned      YES unset  administratively down down
Serial0/0/0            unassigned      YES unset  administratively down down

For "show vlan" or "show vlan brief":
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Fa0/1, Fa0/2, Fa0/3, Fa0/4
                                                Fa0/5, Fa0/6, Fa0/7, Fa0/8
1002 fddi-default                     active
1003 token-ring-default               active
1004 fddinet-default                  active
1005 trnet-default                    active

For "show running-config" or "sh run":
Building configuration...
Current configuration : XXX bytes
!
version 15.1
hostname {hostname}
!
interface GigabitEthernet0/0
 no ip address
 shutdown
!
(... generate realistic config ...)

For "show ip route":
Codes: C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area

Gateway of last resort is not set

(If no routes configured, show this message)

CONFIGURATION COMMANDS:
- Most config commands produce NO OUTPUT on success (empty string)
- Only show output for errors or special confirmations

ERROR MESSAGES (USE EXACT CISCO FORMATS):
- Invalid command: "% Invalid input detected at '^' marker."
- Incomplete command: "% Incomplete command."
- Ambiguous command: "% Ambiguous command: \"xxx\""
- Unknown command: "% Unknown command or computer name, or unable to find computer address"

RESPOND WITH VALID JSON ONLY:
{
    "valid": true/false,
    "output": "command output or empty string for silent success",
    "modeChange": "new_mode_name" or null,
    "hostnameChange": "new_hostname" or null,
    "error": "error description" or null
}

EXAMPLES:

User mode - "enable":
{"valid":true,"output":"","modeChange":"privileged","hostnameChange":null,"error":null}

Privileged mode - "conf t":
{"valid":true,"output":"Enter configuration commands, one per line. End with CNTL/Z.","modeChange":"global_config","hostnameChange":null,"error":null}

Global config - "hostname R1":
{"valid":true,"output":"","modeChange":null,"hostnameChange":"R1","error":null}

Global config - "int g0/0":
{"valid":true,"output":"","modeChange":"interface_config","hostnameChange":null,"error":null}

Interface config - "ip add 192.168.1.1 255.255.255.0":
{"valid":true,"output":"","modeChange":null,"hostnameChange":null,"error":null}

Interface config - "no shut":
{"valid":true,"output":"","modeChange":null,"hostnameChange":null,"error":null}

Interface config - "exit":
{"valid":true,"output":"","modeChange":"global_config","hostnameChange":null,"error":null}

Global config - "end":
{"valid":true,"output":"","modeChange":"privileged","hostnameChange":null,"error":null}

Privileged - "copy run start":
{"valid":true,"output":"Destination filename [startup-config]?\\nBuilding configuration...\\n[OK]","modeChange":null,"hostnameChange":null,"error":null}

REMEMBER: Behave EXACTLY like Cisco Packet Tracer. Be strict about mode restrictions.`;

export async function interpretCommand(
    state: CLIState,
    command: string
): Promise<CLIResponse> {
    // Pre-validate IP addresses and subnet masks BEFORE sending to LLM
    const validationError = preValidateCommand(command);
    if (validationError) {
        return validationError;
    }

    // Validate command is allowed in current mode (like real Cisco IOS)
    const modeError = validateCommandMode(command, state.mode);
    if (modeError) {
        return modeError;
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
