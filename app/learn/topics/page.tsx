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
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-cisco-blue to-primary-600 rounded-xl p-8 text-white">
                <h1 className="text-3xl font-bold mb-2">📚 CCNA 200-301 Curriculum</h1>
                <p className="text-white/80 mb-4">
                    Complete study guide based on the official Cisco CCNA exam objectives
                </p>
                <div className="flex gap-6 text-sm">
                    <div className="bg-white/20 px-4 py-2 rounded-lg">
                        <span className="font-bold">{CCNA_CURRICULUM.length}</span> Domains
                    </div>
                    <div className="bg-white/20 px-4 py-2 rounded-lg">
                        <span className="font-bold">{totalSubtopics}</span> Topics
                    </div>
                    <div className="bg-white/20 px-4 py-2 rounded-lg">
                        <span className="font-bold">~{Math.round(totalMinutes / 60)}</span> Hours Content
                    </div>
                </div>
            </div>

            {/* Domains Grid */}
            <div className="space-y-4">
                {CCNA_CURRICULUM.map((domain) => (
                    <div key={domain.id} className="card overflow-hidden">
                        {/* Domain Header */}
                        <button
                            onClick={() => setExpandedDomain(expandedDomain === domain.id ? null : domain.id)}
                            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 ${domain.color} rounded-xl flex items-center justify-center text-2xl text-white`}>
                                    {domain.icon}
                                </div>
                                <div className="text-left">
                                    <h2 className="text-xl font-bold">{domain.name}</h2>
                                    <p className="text-sm text-gray-500">{domain.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">{domain.subtopics.length} topics</div>
                                    <div className="text-xs text-cisco-blue font-medium">{domain.weight}% of exam</div>
                                </div>
                                <span className={`text-2xl transition-transform ${expandedDomain === domain.id ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                            </div>
                        </button>

                        {/* Subtopics List */}
                        {expandedDomain === domain.id && (
                            <div className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-4">
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {domain.subtopics.map((topic) => (
                                        <Link
                                            key={topic.id}
                                            href={`/learn/topics/${domain.id}/${topic.id}`}
                                            className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-cisco-blue hover:shadow-md transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${topic.difficulty === 'beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    topic.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {topic.difficulty}
                                                </span>
                                                <span className="text-xs text-gray-400">{topic.minutes} min</span>
                                            </div>
                                            <h3 className="font-medium group-hover:text-cisco-blue transition-colors">
                                                {topic.name}
                                            </h3>
                                        </Link>
                                    ))}
                                </div>

                                {/* Start Learning Button */}
                                <div className="mt-4 pt-4 border-t dark:border-gray-700 flex justify-center">
                                    <Link
                                        href={`/learn/topics/${domain.id}`}
                                        className="btn-primary"
                                    >
                                        Start Learning {domain.name} →
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Quick Start CTA */}
            <div className="card p-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-cisco-blue/20">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-cisco-blue rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                        🎯
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold">Not sure where to start?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Take a quick assessment to identify your knowledge gaps
                        </p>
                    </div>
                    <Link href="/learn/quiz" className="btn-outline flex-shrink-0">
                        Take Assessment
                    </Link>
                </div>
            </div>
        </div>
    );
}
