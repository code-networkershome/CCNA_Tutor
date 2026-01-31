'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Clock,
    Target,
    BookOpen,
    ChevronRight,
    Globe,
    Terminal,
    Layers,
    Settings,
    Shield,
    Cpu,
    Sparkles,
    Zap,
    Code,
    ShieldCheck
} from 'lucide-react';

// Domain definitions with Premium Types
const DOMAIN_DATA: Record<string, {
    name: string;
    icon: any;
    color: string;
    bgGradient: string;
    weight: number;
    description: string;
    subtopics: Array<{ id: string; name: string; difficulty: string; minutes: number }>;
}> = {
    'network-fundamentals': {
        name: 'Network Fundamentals',
        icon: Globe,
        color: 'text-cisco-blue',
        bgGradient: 'from-cisco-blue to-cyan-400',
        weight: 20,
        description: 'Understand networking basics including the OSI model, TCP/IP, and addressing',
        subtopics: [
            { id: 'osi-model', name: 'OSI Model Layers', difficulty: 'beginner', minutes: 15 },
            { id: 'tcp-ip-model', name: 'TCP/IP Model', difficulty: 'beginner', minutes: 12 },
            { id: 'binary-hex-conversion', name: 'Binary & Hexadecimal Conversion', difficulty: 'beginner', minutes: 15 },
            { id: 'network-devices', name: 'Network Device Components', difficulty: 'beginner', minutes: 12 },
            { id: 'ipv4-addressing', name: 'IPv4 Addressing', difficulty: 'beginner', minutes: 20 },
            { id: 'ipv6-addressing', name: 'IPv6 Addressing', difficulty: 'intermediate', minutes: 25 },
            { id: 'classful-classless', name: 'Classful vs Classless Addressing', difficulty: 'beginner', minutes: 15 },
            { id: 'subnetting', name: 'Subnetting Basics (FLSM)', difficulty: 'intermediate', minutes: 30 },
            { id: 'vlsm-cidr', name: 'VLSM & CIDR', difficulty: 'intermediate', minutes: 25 },
            { id: 'network-cables', name: 'Network Cables & Connectors', difficulty: 'beginner', minutes: 10 },
            { id: 'network-topologies', name: 'Network Topologies', difficulty: 'beginner', minutes: 12 },
            { id: 'tcp-vs-udp', name: 'TCP vs UDP', difficulty: 'beginner', minutes: 15 },
            { id: 'arp-icmp', name: 'ARP & ICMP Protocols', difficulty: 'beginner', minutes: 12 },
        ],
    },
    'network-access': {
        name: 'Network Access',
        icon: Terminal,
        color: 'text-emerald-500',
        bgGradient: 'from-emerald-500 to-teal-400',
        weight: 20,
        description: 'Configure and troubleshoot VLANs, STP, EtherChannel, and wireless',
        subtopics: [
            { id: 'vlan-basics', name: 'VLAN Basics', difficulty: 'beginner', minutes: 15 },
            { id: 'vlan-trunking', name: 'VLAN Trunking (802.1Q)', difficulty: 'intermediate', minutes: 20 },
            { id: 'dtp-vtp', name: 'DTP & VTP', difficulty: 'intermediate', minutes: 18 },
            { id: 'stp-basics', name: 'Spanning Tree Protocol (STP)', difficulty: 'intermediate', minutes: 25 },
            { id: 'rstp-pvst', name: 'Rapid STP & PVST+', difficulty: 'advanced', minutes: 20 },
            { id: 'etherchannel', name: 'EtherChannel (LACP/PAgP)', difficulty: 'intermediate', minutes: 22 },
            { id: 'wireless-fundamentals', name: 'Wireless Fundamentals', difficulty: 'beginner', minutes: 15 },
            { id: 'wlc-architecture', name: 'WLC & AP Architecture', difficulty: 'intermediate', minutes: 18 },
        ],
    },
    'ip-connectivity': {
        name: 'IP Connectivity',
        icon: Layers,
        color: 'text-indigo-500',
        bgGradient: 'from-indigo-500 to-violet-400',
        weight: 25,
        description: 'Configure routing protocols and understand path selection',
        subtopics: [
            { id: 'routing-fundamentals', name: 'Routing Fundamentals', difficulty: 'beginner', minutes: 15 },
            { id: 'routing-table', name: 'Routing Table & Path Selection', difficulty: 'beginner', minutes: 12 },
            { id: 'static-routing', name: 'Static Routing', difficulty: 'beginner', minutes: 18 },
            { id: 'default-floating-routes', name: 'Default & Floating Routes', difficulty: 'intermediate', minutes: 15 },
            { id: 'inter-vlan-routing', name: 'Inter-VLAN Routing (Router-on-a-Stick)', difficulty: 'intermediate', minutes: 22 },
            { id: 'layer3-switching', name: 'Layer 3 Switching & SVIs', difficulty: 'intermediate', minutes: 18 },
            { id: 'ospf-single-area', name: 'OSPF Single Area', difficulty: 'intermediate', minutes: 30 },
            { id: 'ospf-multi-area', name: 'OSPF Multi-Area', difficulty: 'advanced', minutes: 25 },
            { id: 'ospf-neighbor-states', name: 'OSPF Neighbor States & DR/BDR', difficulty: 'advanced', minutes: 20 },
            { id: 'administrative-distance', name: 'Administrative Distance', difficulty: 'intermediate', minutes: 12 },
            { id: 'hsrp-fhrp', name: 'First Hop Redundancy (HSRP/VRRP)', difficulty: 'intermediate', minutes: 20 },
            { id: 'ipv6-routing', name: 'IPv6 Routing', difficulty: 'intermediate', minutes: 22 },
        ],
    },
    'ip-services': {
        name: 'IP Services',
        icon: Settings,
        color: 'text-amber-500',
        bgGradient: 'from-amber-500 to-orange-400',
        weight: 10,
        description: 'Configure DHCP, NAT, NTP, and network management protocols',
        subtopics: [
            { id: 'dhcp-config', name: 'DHCP Configuration', difficulty: 'beginner', minutes: 18 },
            { id: 'dhcp-relay', name: 'DHCP Relay Agent (ip helper-address)', difficulty: 'intermediate', minutes: 15 },
            { id: 'dns-basics', name: 'DNS Basics', difficulty: 'beginner', minutes: 12 },
            { id: 'nat-types', name: 'NAT (Static, Dynamic, PAT)', difficulty: 'intermediate', minutes: 25 },
            { id: 'ntp-config', name: 'NTP Configuration', difficulty: 'beginner', minutes: 10 },
            { id: 'cdp-lldp', name: 'CDP & LLDP Discovery Protocols', difficulty: 'beginner', minutes: 12 },
            { id: 'tftp-ftp', name: 'TFTP/FTP for IOS Management', difficulty: 'intermediate', minutes: 15 },
            { id: 'snmp-syslog', name: 'SNMP & Syslog', difficulty: 'intermediate', minutes: 18 },
            { id: 'qos-concepts', name: 'QoS Concepts', difficulty: 'intermediate', minutes: 15 },
            { id: 'ssh-config', name: 'SSH Configuration', difficulty: 'beginner', minutes: 12 },
        ],
    },
    'security-fundamentals': {
        name: 'Security Fundamentals',
        icon: ShieldCheck,
        color: 'text-rose-500',
        bgGradient: 'from-rose-500 to-pink-400',
        weight: 15,
        description: 'Implement network security using ACLs, VPNs, and device hardening',
        subtopics: [
            { id: 'security-concepts', name: 'Security Concepts & Threats', difficulty: 'beginner', minutes: 15 },
            { id: 'device-access-control', name: 'Device Access Control (Console/VTY)', difficulty: 'beginner', minutes: 12 },
            { id: 'password-recovery', name: 'Password Recovery Procedures', difficulty: 'intermediate', minutes: 15 },
            { id: 'standard-acls', name: 'Standard ACLs', difficulty: 'beginner', minutes: 18 },
            { id: 'extended-acls', name: 'Extended ACLs', difficulty: 'intermediate', minutes: 22 },
            { id: 'port-security', name: 'Port Security', difficulty: 'intermediate', minutes: 15 },
            { id: 'dhcp-snooping', name: 'DHCP Snooping', difficulty: 'intermediate', minutes: 15 },
            { id: 'dai', name: 'Dynamic ARP Inspection (DAI)', difficulty: 'intermediate', minutes: 15 },
            { id: 'aaa-concepts', name: 'AAA Concepts', difficulty: 'intermediate', minutes: 18 },
            { id: 'vpn-types', name: 'VPN Types (Site-to-Site, Remote Access)', difficulty: 'intermediate', minutes: 15 },
            { id: 'wireless-security', name: 'Wireless Security (WPA2/WPA3)', difficulty: 'intermediate', minutes: 15 },
            { id: 'firewall-concepts', name: 'Firewall Concepts', difficulty: 'beginner', minutes: 12 },
        ],
    },
    'automation-programmability': {
        name: 'Automation & Programmability',
        icon: Code,
        color: 'text-cyan-500',
        bgGradient: 'from-cyan-500 to-sky-400',
        weight: 10,
        description: 'Understand network automation, APIs, and configuration management',
        subtopics: [
            { id: 'rest-apis', name: 'REST APIs', difficulty: 'intermediate', minutes: 18 },
            { id: 'json-xml', name: 'JSON & XML Data Formats', difficulty: 'beginner', minutes: 12 },
            { id: 'cisco-dna-center', name: 'Cisco DNA Center', difficulty: 'intermediate', minutes: 20 },
            { id: 'ansible-basics', name: 'Ansible Basics', difficulty: 'intermediate', minutes: 18 },
            { id: 'python-networking', name: 'Python for Networking', difficulty: 'intermediate', minutes: 22 },
            { id: 'controller-networking', name: 'Controller-Based Networking', difficulty: 'intermediate', minutes: 15 },
        ],
    },
};

export default function DomainPage() {
    const params = useParams();
    const domainId = params.domain as string;
    const domain = DOMAIN_DATA[domainId];

    if (!domain) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="text-6xl animate-bounce">❓</div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">Domain Not Found</h1>
                    <Link href="/learn/topics" className="btn-premium px-8 py-3">
                        Return to Curriculum
                    </Link>
                </div>
            </div>
        );
    }

    const totalMinutes = domain.subtopics.reduce((sum, t) => sum + t.minutes, 0);

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-20">
            {/* Back Nav */}
            <Link href="/learn/topics" className="btn-outline self-start text-xs">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Overview
            </Link>

            {/* Premium Header */}
            <div className={`relative overflow-hidden rounded-[2.5rem] p-10 md:p-14 text-white shadow-2xl`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${domain.bgGradient} opacity-90`}></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-[100px]"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="w-28 h-28 rounded-[2rem] bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                        <domain.icon className="w-14 h-14" />
                    </div>

                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/10 text-white text-[10px] font-black uppercase rounded-lg tracking-widest">
                            Domain {domainId.split('-').map(s => s[0]).join('')}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            {domain.name}
                        </h1>
                        <p className="text-white/80 text-lg font-medium max-w-2xl leading-relaxed">
                            {domain.description}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
                            <p className="text-3xl font-black">{domain.weight}%</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Exam Weight</p>
                        </div>
                        <div className="px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
                            <p className="text-3xl font-black">{domain.subtopics.length}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Modules</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Modules List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-slate-400" /> Learning Modules
                        </h3>
                        <span className="text-xs font-bold text-slate-400">{Math.round(totalMinutes / 60 * 10) / 10} Hours Content</span>
                    </div>

                    <div className="grid gap-4">
                        {domain.subtopics.map((topic, index) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={topic.id}
                            >
                                <Link
                                    href={`/learn/topics/${domainId}/${topic.id}`}
                                    className="glass-card flex items-center justify-between p-5 group border-white/40 hover:border-cisco-blue hover:-translate-y-1 transition-all"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-slate-300 group-hover:text-cisco-blue group-hover:bg-cisco-blue/10 transition-colors">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-cisco-blue transition-colors">
                                                {topic.name}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${topic.difficulty === 'advanced' ? 'text-rose-500 bg-rose-500/10' :
                                                    topic.difficulty === 'intermediate' ? 'text-amber-500 bg-amber-500/10' :
                                                        'text-emerald-500 bg-emerald-500/10'
                                                    }`}>
                                                    {topic.difficulty}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {topic.minutes} min
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-300 group-hover:bg-cisco-blue group-hover:border-cisco-blue group-hover:text-white transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="glass-card p-6 border-white/40 bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
                        <Zap className="w-8 h-8 text-amber-400 mb-4" />
                        <h3 className="text-lg font-black mb-2">Accelerator Mode</h3>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            Ready to test your knowledge on {domain.name}? Jump straight into a targeted automated quiz.
                        </p>
                        <Link href={`/learn/quiz?topic=${domainId}`} className="block w-full py-3 px-6 bg-amber-400 hover:bg-amber-300 text-slate-900 text-center rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg">
                            Take Domain Quiz
                        </Link>
                    </div>

                    <div className="glass-card p-6 border-white/40">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">
                            Related Labs
                        </h3>
                        <div className="space-y-3">
                            <Link href="/learn/labs" className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                    <Terminal className="w-4 h-4" />
                                </div>
                                <div className="text-xs">
                                    <p className="font-bold text-slate-700 dark:text-slate-200">Configure VLANs</p>
                                    <p className="text-slate-400">Intermediate • 20m</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
