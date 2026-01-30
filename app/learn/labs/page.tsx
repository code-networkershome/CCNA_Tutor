'use client';

import { useState, useRef, useEffect } from 'react';
import type { CLIState, CLICommand } from '@/types';

interface HistoryEntry {
    prompt: string;
    command: CLICommand;
}

interface CustomLab {
    id: string;
    title: string;
    description: string;
    objectives: string[];
    topic: string;
    difficulty: string;
}

// Pre-defined lab scenarios - All CCNA Lab Topics
const LAB_SCENARIOS = [
    // Basic/General
    { id: 'sandbox', title: 'Free Practice Sandbox', description: 'Open sandbox - practice any commands freely', topic: 'General', difficulty: 'beginner', objectives: ['Practice any Cisco IOS commands', 'Experiment freely'] },
    { id: 'basic', title: 'Basic Router Setup', description: 'Initial router configuration', topic: 'Basics', difficulty: 'beginner', objectives: ['Set hostname', 'Configure passwords', 'Configure banner MOTD', 'Save configuration'] },

    // Layer 2 - Switching
    { id: 'vlan', title: 'VLAN Configuration', description: 'Create and configure VLANs on a switch', topic: 'VLAN', difficulty: 'beginner', objectives: ['Create VLAN 10 and VLAN 20', 'Assign ports to VLANs', 'Configure trunk port'] },
    { id: 'intervlan', title: 'Inter-VLAN Routing', description: 'Router-on-a-stick configuration', topic: 'VLAN', difficulty: 'intermediate', objectives: ['Configure subinterfaces', 'Enable 802.1Q encapsulation', 'Test inter-VLAN connectivity'] },
    { id: 'stp', title: 'Spanning Tree Protocol', description: 'Configure STP and RSTP', topic: 'STP', difficulty: 'intermediate', objectives: ['Identify root bridge', 'Configure port priorities', 'Enable PortFast and BPDU Guard'] },
    { id: 'etherchannel', title: 'EtherChannel (LACP)', description: 'Configure link aggregation', topic: 'EtherChannel', difficulty: 'intermediate', objectives: ['Create port-channel interface', 'Configure LACP mode', 'Verify channel status'] },
    { id: 'portsecurity', title: 'Port Security', description: 'Secure switch ports', topic: 'Security', difficulty: 'beginner', objectives: ['Enable port security', 'Set maximum MAC addresses', 'Configure violation actions'] },

    // Layer 3 - Routing
    { id: 'static', title: 'Static Routing', description: 'Configure static and default routes', topic: 'Routing', difficulty: 'beginner', objectives: ['Configure static routes', 'Configure default route', 'Verify routing table'] },
    { id: 'ospf', title: 'OSPF Single-Area', description: 'Configure single-area OSPF routing', topic: 'OSPF', difficulty: 'intermediate', objectives: ['Enable OSPF process', 'Advertise networks', 'Verify neighbor adjacencies', 'Configure passive interfaces'] },
    { id: 'ospf-multi', title: 'OSPF Multi-Area', description: 'Configure multi-area OSPF', topic: 'OSPF', difficulty: 'advanced', objectives: ['Configure Area 0 and Area 1', 'Configure ABR', 'Verify LSA types'] },
    { id: 'eigrp', title: 'EIGRP Configuration', description: 'Configure EIGRP routing protocol', topic: 'EIGRP', difficulty: 'intermediate', objectives: ['Enable EIGRP AS', 'Advertise networks', 'Configure K-values', 'Verify neighbor table'] },
    { id: 'eigrp-named', title: 'EIGRP Named Mode', description: 'Configure named EIGRP', topic: 'EIGRP', difficulty: 'advanced', objectives: ['Configure named EIGRP', 'Set address families', 'Configure authentication'] },

    // IPv6
    { id: 'ipv6-basic', title: 'IPv6 Addressing', description: 'Configure IPv6 addresses', topic: 'IPv6', difficulty: 'intermediate', objectives: ['Configure global unicast addresses', 'Configure link-local addresses', 'Verify IPv6 configuration'] },
    { id: 'ipv6-routing', title: 'IPv6 Static Routing', description: 'Configure IPv6 static routes', topic: 'IPv6', difficulty: 'intermediate', objectives: ['Enable IPv6 routing', 'Configure IPv6 static routes', 'Verify IPv6 routing table'] },
    { id: 'ospfv3', title: 'OSPFv3 for IPv6', description: 'Configure OSPFv3', topic: 'IPv6', difficulty: 'advanced', objectives: ['Enable OSPFv3', 'Configure OSPFv3 interfaces', 'Verify IPv6 OSPF neighbors'] },

    // Security
    { id: 'acl-standard', title: 'Standard ACLs', description: 'Create and apply standard ACLs', topic: 'Security', difficulty: 'intermediate', objectives: ['Create numbered standard ACL', 'Create named standard ACL', 'Apply ACL to interface'] },
    { id: 'acl-extended', title: 'Extended ACLs', description: 'Create and apply extended ACLs', topic: 'Security', difficulty: 'intermediate', objectives: ['Create extended ACL', 'Filter by protocol and port', 'Apply ACL inbound/outbound'] },
    { id: 'ssh', title: 'SSH Configuration', description: 'Secure remote access with SSH', topic: 'Security', difficulty: 'beginner', objectives: ['Generate RSA keys', 'Configure SSH version 2', 'Configure VTY lines for SSH'] },
    { id: 'aaa', title: 'AAA Configuration', description: 'Configure authentication and authorization', topic: 'Security', difficulty: 'advanced', objectives: ['Configure local AAA', 'Configure RADIUS/TACACS+', 'Apply AAA to login'] },
    { id: '8021x', title: '802.1X Port Authentication', description: 'Configure port-based authentication', topic: 'Security', difficulty: 'advanced', objectives: ['Enable 802.1X globally', 'Configure ports for 802.1X', 'Configure RADIUS server'] },

    // Network Services
    { id: 'nat', title: 'NAT/PAT Configuration', description: 'Configure NAT/PAT for internet access', topic: 'NAT', difficulty: 'intermediate', objectives: ['Configure inside/outside interfaces', 'Create NAT pool', 'Configure PAT overload'] },
    { id: 'dhcp', title: 'DHCP Server', description: 'Configure router as DHCP server', topic: 'DHCP', difficulty: 'beginner', objectives: ['Create DHCP pool', 'Configure excluded addresses', 'Set default gateway and DNS'] },
    { id: 'dhcp-relay', title: 'DHCP Relay', description: 'Configure DHCP relay agent', topic: 'DHCP', difficulty: 'intermediate', objectives: ['Configure ip helper-address', 'Verify DHCP relay', 'Test client DHCP'] },
    { id: 'ntp', title: 'NTP Configuration', description: 'Configure network time protocol', topic: 'NTP', difficulty: 'beginner', objectives: ['Configure NTP server', 'Configure NTP client', 'Verify time synchronization'] },
    { id: 'syslog', title: 'Syslog & Logging', description: 'Configure logging and syslog', topic: 'Management', difficulty: 'beginner', objectives: ['Configure logging levels', 'Configure syslog server', 'Verify log messages'] },
    { id: 'snmp', title: 'SNMP Configuration', description: 'Configure SNMP monitoring', topic: 'Management', difficulty: 'intermediate', objectives: ['Configure SNMP communities', 'Configure SNMP traps', 'Verify SNMP operation'] },

    // First Hop Redundancy
    { id: 'hsrp', title: 'HSRP Configuration', description: 'Configure Hot Standby Router Protocol', topic: 'FHRP', difficulty: 'advanced', objectives: ['Configure HSRP groups', 'Set priorities and preemption', 'Test failover'] },
    { id: 'vrrp', title: 'VRRP Configuration', description: 'Configure Virtual Router Redundancy', topic: 'FHRP', difficulty: 'advanced', objectives: ['Configure VRRP group', 'Set master priority', 'Verify VRRP state'] },

    // Wireless
    { id: 'wlan-basic', title: 'Basic Wireless Setup', description: 'Configure basic WLAN settings', topic: 'Wireless', difficulty: 'intermediate', objectives: ['Configure SSID', 'Set security mode', 'Configure wireless client'] },
    { id: 'wlc', title: 'WLC Configuration', description: 'Configure Wireless LAN Controller', topic: 'Wireless', difficulty: 'advanced', objectives: ['Configure WLC interface', 'Create WLAN', 'Associate AP to WLC'] },

    // Automation
    { id: 'cdp-lldp', title: 'CDP and LLDP', description: 'Configure discovery protocols', topic: 'Management', difficulty: 'beginner', objectives: ['Enable/disable CDP', 'Enable LLDP', 'View neighbor information'] },
];

export default function LabsPage() {
    const [exercises, setExercises] = useState<any[]>([]);
    const [loadingLabs, setLoadingLabs] = useState(true);
    const [showCreateLab, setShowCreateLab] = useState(false);
    const [customLabs, setCustomLabs] = useState<CustomLab[]>([]);
    const [activeLab, setActiveLab] = useState<CustomLab | null>(null);
    const [newLab, setNewLab] = useState({ title: '', description: '', topic: 'General', difficulty: 'beginner', objectives: '' });

    // Initial state
    const [cliState, setCliState] = useState<CLIState>({
        device: 'router',
        mode: 'user',
        prompt: 'Router>',
        runningConfig: '',
        hostname: 'Router',
        interfaces: {},
    });

    const [commandHistory, setCommandHistory] = useState<HistoryEntry[]>([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const terminalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load custom labs from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('customLabs');
        if (saved) {
            setCustomLabs(JSON.parse(saved));
        }
    }, []);

    // Add this effect to fetch labs
    useEffect(() => {
        const fetchLabs = async () => {
            try {
                const response = await fetch('/api/labs');
                const data = await response.json();
                if (data.success) {
                    setExercises(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch labs:', error);
            } finally {
                setLoadingLabs(false);
            }
        };

        fetchLabs();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [commandHistory, isProcessing]);

    // Focus input on mount and click
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleCreateLab = () => {
        if (!newLab.title.trim()) return;

        const lab: CustomLab = {
            id: Date.now().toString(),
            title: newLab.title,
            description: newLab.description || 'Custom practice lab',
            topic: newLab.topic,
            difficulty: newLab.difficulty,
            objectives: newLab.objectives.split('\n').filter(o => o.trim()),
        };

        const updated = [lab, ...customLabs];
        setCustomLabs(updated);
        localStorage.setItem('customLabs', JSON.stringify(updated));
        setNewLab({ title: '', description: '', topic: 'General', difficulty: 'beginner', objectives: '' });
        setShowCreateLab(false);
        setActiveLab(lab);
    };

    const handleDeleteCustomLab = (id: string) => {
        if (!confirm('Delete this custom lab?')) return;
        const updated = customLabs.filter(l => l.id !== id);
        setCustomLabs(updated);
        localStorage.setItem('customLabs', JSON.stringify(updated));
        if (activeLab?.id === id) setActiveLab(null);
    };

    const handleStartLab = (lab: CustomLab) => {
        setActiveLab(lab);
        handleReset();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        const commandText = input.trim();
        setIsProcessing(true);
        setInput('');
        setHistoryIndex(-1);

        // Store prompt before execution
        const currentPrompt = cliState.prompt;

        try {
            const res = await fetch('/api/cli', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: commandText,
                    state: cliState,
                }),
            });

            const data = await res.json();

            if (data.success) {
                const newCommand: CLICommand = {
                    device: cliState.device,
                    command: commandText,
                    output: data.response.output,
                    timestamp: new Date(),
                    valid: data.response.valid,
                };

                setCommandHistory(prev => [...prev, { prompt: currentPrompt, command: newCommand }]);
                setCliState(data.newState);
            } else {
                // Handle API error
                const errorCommand: CLICommand = {
                    device: cliState.device,
                    command: commandText,
                    output: `% Connection error: ${data.error}`,
                    timestamp: new Date(),
                    valid: false,
                };
                setCommandHistory(prev => [...prev, { prompt: currentPrompt, command: errorCommand }]);
            }
        } catch (error) {
            const errorCommand: CLICommand = {
                device: cliState.device,
                command: commandText,
                output: '% Network error. Please check your connection.',
                timestamp: new Date(),
                valid: false,
            };
            setCommandHistory(prev => [...prev, { prompt: currentPrompt, command: errorCommand }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isProcessing) return;

        const inputCommands = commandHistory.map(h => h.command.command);

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex < inputCommands.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setInput(inputCommands[inputCommands.length - 1 - newIndex] || '');
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(inputCommands[inputCommands.length - 1 - newIndex] || '');
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setInput('');
            }
        }
    };

    const handleReset = async () => {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/cli');
            const data = await res.json();
            if (data.success) {
                setCliState(data.state);
                setCommandHistory([]);
                setInput('');
            }
        } finally {
            setIsProcessing(false);
            inputRef.current?.focus();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Practice Labs</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Practice Cisco IOS commands in a realistic terminal
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">AI-Powered</span>
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateLab(true)}
                    className="btn-primary"
                >
                    + Create Custom Lab
                </button>
            </div>

            {/* Create Custom Lab Modal */}
            {showCreateLab && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg p-6">
                        <h2 className="text-xl font-bold mb-4">Create Custom Lab</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Lab Title *</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="e.g., My OSPF Practice"
                                    value={newLab.title}
                                    onChange={(e) => setNewLab(l => ({ ...l, title: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="What will you practice?"
                                    value={newLab.description}
                                    onChange={(e) => setNewLab(l => ({ ...l, description: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Topic</label>
                                    <select
                                        className="input w-full"
                                        value={newLab.topic}
                                        onChange={(e) => setNewLab(l => ({ ...l, topic: e.target.value }))}
                                    >
                                        <option value="General">General</option>
                                        <option value="VLAN">VLAN</option>
                                        <option value="OSPF">OSPF</option>
                                        <option value="Security">Security</option>
                                        <option value="NAT">NAT</option>
                                        <option value="STP">STP</option>
                                        <option value="FHRP">FHRP</option>
                                        <option value="IPv6">IPv6</option>
                                        <option value="Wireless">Wireless</option>
                                        <option value="Automation">Automation</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Difficulty</label>
                                    <select
                                        className="input w-full"
                                        value={newLab.difficulty}
                                        onChange={(e) => setNewLab(l => ({ ...l, difficulty: e.target.value }))}
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Objectives (one per line)</label>
                                <textarea
                                    className="input w-full h-24"
                                    placeholder="Configure VLAN 10&#10;Assign ports to VLAN&#10;Verify configuration"
                                    value={newLab.objectives}
                                    onChange={(e) => setNewLab(l => ({ ...l, objectives: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button className="btn-outline" onClick={() => setShowCreateLab(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleCreateLab}>Create Lab</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Lab Banner */}
            {activeLab && (
                <div className="card p-4 bg-cisco-blue/10 border-cisco-blue border">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold text-cisco-blue">📝 {activeLab.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${activeLab.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                                    activeLab.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {activeLab.difficulty}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{activeLab.description}</p>
                        </div>
                        <button
                            onClick={() => setActiveLab(null)}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            ✕ Close Lab
                        </button>
                    </div>
                    {activeLab.objectives.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-cisco-blue/20">
                            <span className="text-sm font-medium">Objectives:</span>
                            <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                                {activeLab.objectives.map((obj, i) => (
                                    <li key={i}>{obj}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Labs List */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Quick Start Scenarios */}
                    <div>
                        <h2 className="font-semibold mb-2">Quick Start Scenarios</h2>
                        <div className="space-y-2">
                            {LAB_SCENARIOS.map((lab) => (
                                <button
                                    key={lab.id}
                                    onClick={() => handleStartLab(lab)}
                                    className={`w-full text-left card p-3 hover:shadow-md transition-shadow ${activeLab?.id === lab.id ? 'ring-2 ring-cisco-blue' : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm">{lab.title}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${lab.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                                            lab.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {lab.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{lab.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Labs */}
                    {customLabs.length > 0 && (
                        <div>
                            <h2 className="font-semibold mb-2">My Custom Labs</h2>
                            <div className="space-y-2">
                                {customLabs.map((lab) => (
                                    <div
                                        key={lab.id}
                                        className={`card p-3 hover:shadow-md transition-shadow ${activeLab?.id === lab.id ? 'ring-2 ring-cisco-blue' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => handleStartLab(lab)}
                                                className="font-medium text-sm text-left flex-1"
                                            >
                                                {lab.title}
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded ${lab.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                                                    lab.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {lab.difficulty}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteCustomLab(lab.id)}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{lab.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Admin Labs */}
                    {exercises.length > 0 && (
                        <div>
                            <h2 className="font-semibold mb-2">Official Labs</h2>
                            {loadingLabs ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="card p-4 animate-pulse h-24" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {exercises.map((ex) => (
                                        <div key={ex.id} className="card p-3 hover:shadow-md transition-shadow cursor-pointer">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-medium text-sm">{ex.title}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded ${ex.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                                                    ex.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {ex.difficulty.charAt(0).toUpperCase() + ex.difficulty.slice(1)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2">{ex.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* CLI Terminal */}
                <div className="lg:col-span-2">
                    <div className="card overflow-hidden">
                        <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <span className="text-sm text-gray-400">Cisco IOS Simulator (AI-Powered)</span>
                            <button
                                onClick={handleReset}
                                className="text-xs text-gray-400 hover:text-white"
                            >
                                Reset
                            </button>
                        </div>

                        <div
                            ref={terminalRef}
                            className="cli-terminal h-96 overflow-y-auto"
                            onClick={() => !isProcessing && inputRef.current?.focus()}
                        >
                            <div className="text-green-400 mb-2">
                                Cisco IOS Software, CCNA Tutor Simulation
                                <br />Type &apos;?&apos; for help.
                                <br />
                                <br />
                                <span className="text-yellow-400">💡 Tip: This terminal is powered by AI and understands natural Cisco commands!</span>
                            </div>

                            {commandHistory.map((entry, i) => (
                                <div key={i} className="mb-1">
                                    <div>
                                        <span className="cli-prompt">{entry.prompt}</span>
                                        <span className="cli-command">{entry.command.command}</span>
                                    </div>
                                    {entry.command.output && (
                                        <div className={entry.command.valid ? 'cli-output whitespace-pre-wrap' : 'cli-error whitespace-pre-wrap'}>
                                            {entry.command.output}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <form onSubmit={handleSubmit} className="flex">
                                <span className="cli-prompt">{cliState.prompt}</span>
                                {isProcessing ? (
                                    <span className="animate-pulse text-gray-400 ml-1">▋</span>
                                ) : (
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="flex-1 bg-transparent border-none outline-none text-white font-mono"
                                        autoComplete="off"
                                        spellCheck={false}
                                        autoFocus
                                    />
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Quick Commands */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="text-sm text-gray-500">Quick commands:</span>
                        {['enable', 'conf t', 'show run', 'sh ip int br', 'show vlan', '?'].map((cmd) => (
                            <button
                                key={cmd}
                                onClick={() => !isProcessing && setInput(cmd)}
                                disabled={isProcessing}
                                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                                {cmd}
                            </button>
                        ))}
                    </div>

                    {/* Mode Indicator */}
                    <div className="mt-2 text-xs text-gray-500 flex justify-between">
                        <span>
                            Current mode: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">
                                {cliState.mode.replace('_', ' ')}
                            </span>
                        </span>
                        {isProcessing && <span className="text-green-600 animate-pulse">Processing...</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
