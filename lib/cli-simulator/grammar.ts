export type CommandHandler = (args: string[], state: any) => any;

export interface CommandNode {
    token: string;
    description?: string;
    handler?: CommandHandler;
    children?: Record<string, CommandNode>;
    isArgument?: boolean; // If true, matches any token (e.g. <ip>, <name>)
    argName?: string;
    minMode?: string; // Minimum mode required
}

export type CLIContext = 'user' | 'privileged' | 'global_config' | 'interface_config' | 'router_config' | 'line_config' | 'vlan_config';

/**
 * grammar.ts
 * Defines the strict command tree for the simulator.
 */
export const COMMAND_GRAMMAR: Record<CLIContext, Record<string, CommandNode>> = {
    // ==========================================
    // 1. USER EXEC MODE
    // ==========================================
    user: {
        'enable': { token: 'enable', description: 'Turn on privileged commands' },
        'en': { token: 'en', description: 'Turn on privileged commands' }, // Alias
        'exit': { token: 'exit', description: 'Exit the terminal' },
        'ping': {
            token: 'ping',
            children: {
                '<target>': { token: '<target>', isArgument: true, argName: 'target' }
            }
        },
        'show': {
            token: 'show',
            children: {
                'version': { token: 'version' },
                'clock': { token: 'clock' }
            }
        }
    },

    // ==========================================
    // 2. PRIVILEGED EXEC MODE
    // ==========================================
    privileged: {
        'configure': {
            token: 'configure',
            children: {
                'terminal': { token: 'terminal', description: 'Configure from the terminal' }
            }
        },
        'conf': { // Alias
            token: 'conf',
            children: {
                't': { token: 't' },
                'terminal': { token: 'terminal' }
            }
        },
        'exit': { token: 'exit' },
        'disable': { token: 'disable' },
        'show': {
            token: 'show',
            children: {
                'run': { token: 'run' },
                'running-config': { token: 'running-config' },
                'ip': {
                    token: 'ip',
                    children: {
                        'interface': {
                            token: 'interface',
                            children: {
                                'brief': { token: 'brief' },
                                'br': { token: 'br' } // Alias
                            }
                        },
                        'route': { token: 'route' }
                    }
                },
                'vlan': {
                    token: 'vlan',
                    children: {
                        'brief': { token: 'brief' },
                        'br': { token: 'br' }
                    }
                },
                'version': { token: 'version' }
            }
        },
        'sh': { // Alias root for show
            token: 'sh',
            children: {
                // Clone of show structure (simplified for brevity, full impl in processor loops usually)
                'run': { token: 'run' },
                'ip': {
                    token: 'ip',
                    children: {
                        'int': {
                            token: 'int',
                            children: { 'br': { token: 'br' } }
                        },
                        'route': { token: 'route' }
                    }
                },
                'vlan': { token: 'vlan', children: { 'br': { token: 'br' } } }
            }
        },
        'write': { token: 'write', description: 'Save configuration' },
        'wr': { token: 'wr' }
    },

    // ==========================================
    // 3. GLOBAL CONFIG MODE
    // ==========================================
    global_config: {
        'hostname': {
            token: 'hostname',
            children: {
                '<name>': { token: '<name>', isArgument: true, argName: 'name' }
            }
        },
        'interface': {
            token: 'interface',
            children: {
                '<iface>': { token: '<iface>', isArgument: true, argName: 'iface' }
            }
        },
        'int': { // Alias
            token: 'int',
            children: {
                '<iface>': { token: '<iface>', isArgument: true, argName: 'iface' }
            }
        },
        'vlan': {
            token: 'vlan',
            children: {
                '<id>': { token: '<id>', isArgument: true, argName: 'id' }
            }
        },
        'ip': {
            token: 'ip',
            children: {
                'route': {
                    token: 'route',
                    children: {
                        '<network>': {
                            token: '<network>', isArgument: true, argName: 'network',
                            children: {
                                '<mask>': {
                                    token: '<mask>', isArgument: true, argName: 'mask',
                                    children: {
                                        '<nexthop>': { token: '<nexthop>', isArgument: true, argName: 'nexthop' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        'router': {
            token: 'router',
            children: {
                'rip': { token: 'rip' },
                'ospf': {
                    token: 'ospf',
                    children: {
                        '<id>': { token: '<id>', isArgument: true, argName: 'processId' }
                    }
                }
            }
        },
        'exit': { token: 'exit' },
        'end': { token: 'end' },
        'do': {
            token: 'do',
            // Special handling in processor: execute sub-command as privileged
        }
    },

    // ==========================================
    // 4. INTERFACE CONFIG MODE
    // ==========================================
    interface_config: {
        'ip': {
            token: 'ip',
            children: {
                'address': {
                    token: 'address',
                    children: {
                        '<ip>': {
                            token: '<ip>', isArgument: true, argName: 'ip',
                            children: {
                                '<mask>': { token: '<mask>', isArgument: true, argName: 'mask' }
                            }
                        }
                    }
                },
                'add': { // Alias
                    token: 'add',
                    children: {
                        '<ip>': {
                            token: '<ip>', isArgument: true, argName: 'ip',
                            children: {
                                '<mask>': { token: '<mask>', isArgument: true, argName: 'mask' }
                            }
                        }
                    }
                }
            }
        },
        'shutdown': { token: 'shutdown' },
        'no': {
            token: 'no',
            children: {
                'shutdown': { token: 'shutdown' },
                'shut': { token: 'shut' },
                'ip': {
                    token: 'ip',
                    children: {
                        'address': { token: 'address' }
                    }
                }
            }
        },
        'description': {
            token: 'description',
            children: {
                '<text>': { token: '<text>', isArgument: true, argName: 'description' }
            }
        },
        'exit': { token: 'exit' },
        'end': { token: 'end' }
    },

    // ==========================================
    // 5. VLAN CONFIG MODE
    // ==========================================
    vlan_config: {
        'name': {
            token: 'name',
            children: {
                '<name>': { token: '<name>', isArgument: true, argName: 'name' }
            }
        },
        'exit': { token: 'exit' },
        'end': { token: 'end' }
    },

    // Placeholders for other modes
    router_config: {
        'version': {
            token: 'version',
            children: {
                '<ver>': { token: '<ver>', isArgument: true, argName: 'version' }
            }
        },
        'network': {
            token: 'network',
            children: {
                '<net>': {
                    token: '<net>', isArgument: true, argName: 'network',
                    children: {
                        '<wildcard>': {
                            token: '<wildcard>', isArgument: true, argName: 'wildcard',
                            children: {
                                'area': {
                                    token: 'area',
                                    children: {
                                        '<area>': { token: '<area>', isArgument: true, argName: 'area' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        'no': {
            token: 'no',
            children: {
                'auto-summary': { token: 'auto-summary' }
            }
        },
        'exit': { token: 'exit' },
        'end': { token: 'end' }
    },
    line_config: { 'exit': { token: 'exit' }, 'end': { token: 'end' } }
};
