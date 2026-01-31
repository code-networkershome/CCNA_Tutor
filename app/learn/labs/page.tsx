'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Terminal,
    Settings,
    Trash2,
    Save,
    Play,
    Plus,
    ChevronRight,
    Globe,
    Shield,
    Zap,
    Cpu,
    Monitor,
    RefreshCw,
    Search,
    BookOpen,
    ArrowRight
} from 'lucide-react';
import type { CLIState, CLICommand, NetworkTopology } from '@/types';
import TopologyCanvas from './components/TopologyCanvas';
import { connectDevices } from '@/lib/cli-simulator/topology-engine';

// Pre-defined lab scenarios - All CCNA Lab Topics
const LAB_SCENARIOS = [
    // Basic/General
    { id: 'sandbox', title: 'Open Sandbox', description: 'Practice any Cisco IOS commands свободно', topic: 'General', difficulty: 'Beginner' },
    { id: 'basic', title: 'Basic Router Setup', description: 'Hostname, banners, and passwords', topic: 'Basics', difficulty: 'Beginner' },

    // Layer 2 - Switching
    { id: 'vlan', title: 'VLAN Configuration', description: 'Create and assign VLANs', topic: 'Switching', difficulty: 'Beginner' },
    { id: 'intervlan', title: 'Inter-VLAN Routing', description: 'Router-on-a-stick optimization', topic: 'Switching', difficulty: 'Intermediate' },
    { id: 'stp', title: 'Spanning Tree (STP)', description: 'Root bridge manipulation', topic: 'Switching', difficulty: 'Intermediate' },
    { id: 'etherchannel', title: 'EtherChannel (LACP)', description: 'Link aggregation bundles', topic: 'Switching', difficulty: 'Intermediate' },
    { id: 'portsecurity', title: 'Port Security', description: 'MAC address limiting', topic: 'Security', difficulty: 'Beginner' },

    // Layer 3 - Routing
    { id: 'static', title: 'Static Routing', description: 'Manual route definition', topic: 'Routing', difficulty: 'Beginner' },
    { id: 'ospf', title: 'OSPF Single-Area', description: 'Link-state protocol basics', topic: 'Routing', difficulty: 'Intermediate' },
    { id: 'ospf-multi', title: 'OSPF Multi-Area', description: 'Complex OSPF topologies', topic: 'Routing', difficulty: 'Expert' },
    { id: 'eigrp', title: 'EIGRP Configuration', description: 'Distance vector routing', topic: 'Routing', difficulty: 'Intermediate' },
    { id: 'eigrp-named', title: 'EIGRP Named Mode', description: 'Modern EIGRP syntax', topic: 'Routing', difficulty: 'Expert' },

    // IPv6
    { id: 'ipv6-basic', title: 'IPv6 Addressing', description: 'Dual-stack implementation', topic: 'IPv6', difficulty: 'Intermediate' },
    { id: 'ipv6-routing', title: 'IPv6 Static Routes', description: 'Next-hop IPv6 routing', topic: 'IPv6', difficulty: 'Intermediate' },
    { id: 'ospfv3', title: 'OSPFv3 for IPv6', description: 'Routing IPv6 with OSPF', topic: 'IPv6', difficulty: 'Expert' },

    // Security
    { id: 'acl-standard', title: 'Standard ACLs', description: 'Source-based filtering', topic: 'Security', difficulty: 'Intermediate' },
    { id: 'acl-extended', title: 'Extended ACLs', description: 'Granular traffic control', topic: 'Security', difficulty: 'Intermediate' },
    { id: 'ssh', title: 'SSH Configuration', description: 'Secure remote management', topic: 'Security', difficulty: 'Beginner' },
    { id: 'aaa', title: 'AAA & RADIUS', description: 'Authentication framework', topic: 'Security', difficulty: 'Expert' },

    // Services
    { id: 'nat', title: 'NAT/PAT Config', description: 'Network Address Translation', topic: 'Services', difficulty: 'Intermediate' },
    { id: 'dhcp', title: 'DHCP Server', description: 'Dynamic address allocation', topic: 'Services', difficulty: 'Beginner' },
    { id: 'ntp', title: 'NTP Synchronization', description: 'Time protocol setup', topic: 'Services', difficulty: 'Beginner' },
];

const DEFAULT_CLI_STATE: CLIState = {
    device: 'router', mode: 'user', prompt: 'Router>', runningConfig: '', hostname: 'Router', interfaces: {}, vlans: [], routes: [], modeHistory: [],
};

export default function LabsPage() {
    const [topology, setTopology] = useState<NetworkTopology>({
        id: 'lab-session',
        name: 'Lab Session',
        devices: {
            'R1': {
                id: 'R1', name: 'Router 1', type: 'router', position: { x: 0, y: 0 },
                interfaces: {
                    'Gi0/0': { name: 'Gi0/0', status: 'down' },
                    'Gi0/1': { name: 'Gi0/1', status: 'down' },
                    'Gi0/2': { name: 'Gi0/2', status: 'down' },
                    'Gi0/3': { name: 'Gi0/3', status: 'down' }
                },
                config: { ...DEFAULT_CLI_STATE, hostname: 'Router', prompt: 'Router>', interfaces: {} }
            }
        },
        links: []
    });
    const [activeDeviceId, setActiveDeviceId] = useState<string>('R1');
    const [commandHistory, setCommandHistory] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const terminalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll
    useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [commandHistory, isProcessing]);

    const handleAddDevice = (type: 'router' | 'switch' | 'pc') => {
        const count = Object.keys(topology.devices).length + 1;
        const id = `${type === 'router' ? 'R' : type === 'switch' ? 'SW' : 'PC'}${count}`;

        const newDevice: any = {
            id, name: `${type.toUpperCase()} ${count}`, type, position: { x: 0, y: 0 },
            interfaces: type === 'pc' ? { 'Eth0': { name: 'Eth0', status: 'up' } } : { 'Gi0/0': { name: 'Gi0/0', status: 'down' }, 'Gi0/1': { name: 'Gi0/1', status: 'down' } },
            config: { ...DEFAULT_CLI_STATE, device: type, hostname: id, prompt: `${id}>` }
        };

        setTopology(prev => ({ ...prev, devices: { ...prev.devices, [id]: newDevice } }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;
        const cmdText = input.trim();
        setIsProcessing(true);
        setInput('');

        const currentPrompt = topology.devices[activeDeviceId].config?.prompt || 'Router>';

        try {
            const res = await fetch('/api/cli', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmdText, state: topology.devices[activeDeviceId].config, topology: topology, deviceId: activeDeviceId }),
            });
            const data = await res.json();
            if (data.success) {
                setCommandHistory(prev => [...prev, { prompt: currentPrompt, command: { command: cmdText, output: data.response.output, valid: data.response.valid } }]);
                if (data.newTopology) setTopology(data.newTopology);
                else setTopology(prev => ({ ...prev, devices: { ...prev.devices, [activeDeviceId]: { ...prev.devices[activeDeviceId], config: data.newState } } }));
            }
        } catch (error) {
            setCommandHistory(prev => [...prev, { prompt: currentPrompt, command: { command: cmdText, output: '% Network error', valid: false } }]);
        } finally { setIsProcessing(false); }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Terminal className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Virtual Environment</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Precision <span className="text-cisco-blue">Labs</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed font-medium">
                        Deploy complex network topologies and practice real Cisco IOS configurations in our high-fidelity simulator.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-6 py-3 glass rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-2 border-white/40">
                        <Save className="w-4 h-4" /> Snapshot
                    </button>
                    <button className="btn-premium px-8 py-3 text-xs">
                        Submit Lab Finish
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Deployment Sidebar */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="glass-card p-6 border-white/40">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-cisco-blue" /> Construct
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleAddDevice('router')} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-cisco-blue hover:text-white transition-all group">
                                <Globe className="w-6 h-6 text-slate-400 group-hover:text-white" />
                                <span className="text-[10px] font-black uppercase">Router</span>
                            </button>
                            <button onClick={() => handleAddDevice('switch')} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-emerald-500 hover:text-white transition-all group">
                                <Cpu className="w-6 h-6 text-slate-400 group-hover:text-white" />
                                <span className="text-[10px] font-black uppercase">Switch</span>
                            </button>
                            <button onClick={() => handleAddDevice('pc')} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-indigo-500 hover:text-white transition-all group">
                                <Monitor className="w-6 h-6 text-slate-400 group-hover:text-white" />
                                <span className="text-[10px] font-black uppercase">Host PC</span>
                            </button>
                            <button className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-white/10 transition-all group">
                                <RefreshCw className="w-6 h-6 text-slate-400" />
                                <span className="text-[10px] font-black uppercase text-slate-400">Clear</span>
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-6 border-white/40">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" /> Scenarios
                        </h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 pr-2">
                            {LAB_SCENARIOS.map(lab => (
                                <button key={lab.id} className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all text-left group">
                                    <div className="flex-1 min-w-0 mr-2">
                                        <p className="text-xs font-black text-slate-900 dark:text-white group-hover:text-cisco-blue truncate">{lab.title}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{lab.topic} • {lab.difficulty}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-cisco-blue flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Viewport */}
                <div className="lg:col-span-9 space-y-6">
                    {/* Topology Viz */}
                    <div className="glass-card p-2 border-white/40 bg-slate-50 dark:bg-slate-900/50 shadow-inner min-h-[400px] relative overflow-hidden">
                        <div className="absolute top-4 left-4 z-20 px-3 py-1.5 glass rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Live Viewport
                        </div>
                        <TopologyCanvas
                            topology={topology}
                            activeDeviceId={activeDeviceId}
                            onDeviceSelect={setActiveDeviceId}
                            onConnect={(p) => setTopology(prev => connectDevices(prev, p.source, p.sourcePort, p.target, p.targetPort))}
                            onPositionsChange={(positions) => {
                                setTopology(prev => {
                                    const newDevices = { ...prev.devices };
                                    Object.entries(positions).forEach(([id, pos]) => {
                                        if (newDevices[id]) {
                                            newDevices[id] = { ...newDevices[id], position: pos };
                                        }
                                    });
                                    return { ...prev, devices: newDevices };
                                });
                            }}
                        />
                    </div>

                    {/* Unified Terminal Container */}
                    <div className="glass-card p-1 border-white/40 bg-slate-950 shadow-2xl rounded-[2.5rem] overflow-hidden">
                        <div className="h-12 bg-slate-900/50 flex items-center justify-between px-6 border-b border-white/5">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Device:</span>
                                <span className="text-[10px] font-black text-cisco-blue uppercase tracking-widest px-2 py-0.5 bg-cisco-blue/10 rounded-md border border-cisco-blue/20">
                                    {topology.devices[activeDeviceId]?.id || 'Select Device'}
                                </span>
                            </div>
                            <button className="text-[10px] font-black text-slate-500 uppercase hover:text-white transition-colors">Clear Buffer</button>
                        </div>

                        <div
                            ref={terminalRef}
                            onClick={() => inputRef.current?.focus()}
                            className="h-[400px] p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800"
                        >
                            <div className="text-emerald-500 font-mono text-xs leading-relaxed mb-6 opacity-80">
                                Cisco IOS Simulation Core v4.2.0 • AI Response Protocol Engaged<br />
                                Initializing secure terminal session with {topology.devices[activeDeviceId]?.name || 'Target'}...
                            </div>

                            {commandHistory.map((h, i) => (
                                <div key={i} className="mb-4">
                                    <div className="flex gap-2">
                                        <span className="cli-prompt">{h.prompt}</span>
                                        <span className="cli-command tracking-wide">{h.command.command}</span>
                                    </div>
                                    <AnimatePresence>
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`mt-2 ${h.command.valid ? 'cli-output' : 'cli-error'}`}
                                        >
                                            {h.command.output}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            ))}

                            <form onSubmit={handleSubmit} className="flex gap-2 group">
                                <span className="cli-prompt">{topology.devices[activeDeviceId]?.config?.prompt || '>'}</span>
                                {isProcessing ? (
                                    <div className="flex gap-1 items-center">
                                        <div className="w-2 h-4 bg-emerald-500/50 animate-pulse"></div>
                                    </div>
                                ) : (
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 font-mono text-sm caret-cisco-blue"
                                        autoFocus
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Quick Commands Chips */}
                    <div className="flex flex-wrap gap-2 px-4">
                        {['enable', 'conf t', 'show run', 'sh ip int br', 'show vlan', 'reload'].map(cmd => (
                            <button
                                key={cmd}
                                onClick={() => !isProcessing && setInput(cmd)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-cisco-blue hover:text-cisco-blue transition-all"
                            >
                                {cmd}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
