'use client';

import { useState } from 'react';
import Link from 'next/link';

// Complete CCNA 200-301 Curriculum Structure
const CCNA_CURRICULUM = [
    {
        id: 'network-fundamentals',
        name: 'Network Fundamentals',
        icon: '🌐',
        weight: 20,
        description: 'Understand networking basics including the OSI model, TCP/IP, and addressing',
        color: 'bg-blue-500',
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
    {
        id: 'network-access',
        name: 'Network Access',
        icon: '🔌',
        weight: 20,
        description: 'Configure and troubleshoot VLANs, STP, EtherChannel, and wireless',
        color: 'bg-green-500',
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
    {
        id: 'ip-connectivity',
        name: 'IP Connectivity',
        icon: '🛣️',
        weight: 25,
        description: 'Configure routing protocols and understand path selection',
        color: 'bg-purple-500',
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
    {
        id: 'ip-services',
        name: 'IP Services',
        icon: '⚙️',
        weight: 10,
        description: 'Configure DHCP, NAT, NTP, and network management protocols',
        color: 'bg-orange-500',
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
    {
        id: 'security-fundamentals',
        name: 'Security Fundamentals',
        icon: '🔒',
        weight: 15,
        description: 'Implement network security using ACLs, VPNs, and device hardening',
        color: 'bg-red-500',
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
    {
        id: 'automation-programmability',
        name: 'Automation & Programmability',
        icon: '🤖',
        weight: 10,
        description: 'Understand network automation, APIs, and configuration management',
        color: 'bg-cyan-500',
        subtopics: [
            { id: 'rest-apis', name: 'REST APIs', difficulty: 'intermediate', minutes: 18 },
            { id: 'json-xml', name: 'JSON & XML Data Formats', difficulty: 'beginner', minutes: 12 },
            { id: 'cisco-dna-center', name: 'Cisco DNA Center', difficulty: 'intermediate', minutes: 20 },
            { id: 'ansible-basics', name: 'Ansible Basics', difficulty: 'intermediate', minutes: 18 },
            { id: 'python-networking', name: 'Python for Networking', difficulty: 'intermediate', minutes: 22 },
            { id: 'controller-networking', name: 'Controller-Based Networking', difficulty: 'intermediate', minutes: 15 },
        ],
    },
];

export default function TopicsPage() {
    const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

    const totalSubtopics = CCNA_CURRICULUM.reduce((sum, domain) => sum + domain.subtopics.length, 0);
    const totalMinutes = CCNA_CURRICULUM.reduce(
        (sum, domain) => sum + domain.subtopics.reduce((s, t) => s + t.minutes, 0),
        0
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header Section */}
            <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-400">📖</span>
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Learning Path</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Topics</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Complete all topics to prepare for the CCNA certification exam</p>
                    </div>

                    <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                        <span>🏆</span> 5 of {totalSubtopics} completed
                    </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold text-slate-900 dark:text-white">Overall Progress</span>
                        <span className="font-bold text-emerald-600">19%</span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-[19%]"></div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-slate-500">Completed</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                            <span className="text-slate-500">In Progress</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                            <span className="text-slate-500">Locked</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Domains List */}
            <div className="space-y-4">
                {CCNA_CURRICULUM.map((domain, index) => {
                    // Mock progress for demo (matching screenshot loosely)
                    const progress = [33, 25, 40, 0, 0, 0][index] || 0;
                    const isExpanded = expandedDomain === domain.id;

                    return (
                        <div key={domain.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm transition-shadow hover:shadow-md">
                            {/* Domain Header */}
                            <button
                                onClick={() => setExpandedDomain(isExpanded ? null : domain.id)}
                                className="w-full p-6 flex items-start md:items-center gap-4 text-left"
                            >
                                <div className="flex-shrink-0 w-12 h-12 bg-slate-100 dark:bg-gray-700 rounded-xl flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                                    {index + 1}.0
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{domain.name}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{domain.description}</p>
                                </div>

                                <div className="hidden md:flex items-center gap-8 mr-4">
                                    <div className="flex flex-col items-end w-32">
                                        <span className="text-lg font-bold text-slate-900 dark:text-white">{progress}%</span>
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">{domain.subtopics.length} topics</span>
                                    </div>
                                </div>

                                <span className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50">
                                    <div className="divide-y divide-slate-100 dark:divide-gray-700">
                                        {domain.subtopics.map((topic, subIndex) => {
                                            // Mock status
                                            const isDone = index === 0 && subIndex < 2;
                                            const isLocked = index > 2;

                                            return (
                                                <div key={topic.id} className="p-4 pl-6 md:pl-20 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white dark:hover:bg-gray-700/50 transition-colors">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 
                                                            ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                                isLocked ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-transparent'}`}>
                                                            {isDone && '✓'}
                                                            {isLocked && '🔒'}
                                                        </div>
                                                        <div>
                                                            <h3 className={`font-medium ${isLocked ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                                                {index + 1}.{subIndex + 1} {topic.name}
                                                            </h3>
                                                            {isDone && (
                                                                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold tracking-wide rounded">Done</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 pl-10 md:pl-0">
                                                        <span className="text-sm text-slate-400 flex items-center gap-1">
                                                            <span>⏱</span> {topic.minutes}m
                                                        </span>

                                                        {isLocked ? (
                                                            <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 text-sm font-semibold rounded-lg cursor-not-allowed">
                                                                Locked
                                                            </button>
                                                        ) : (
                                                            <Link
                                                                href={isDone ? `/learn/topics/${domain.id}/${topic.id}/review` : `/learn/topics/${domain.id}/${topic.id}`}
                                                                className={`px-6 py-2 text-sm font-semibold rounded-lg transition-colors
                                                                    ${isDone
                                                                        ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                                                        : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                                                            >
                                                                {isDone ? 'Review' : 'Start'}
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
