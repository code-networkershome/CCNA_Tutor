'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Domain definitions
const DOMAIN_DATA: Record<string, {
    name: string;
    icon: string;
    color: string;
    weight: number;
    description: string;
    subtopics: Array<{ id: string; name: string; difficulty: string; minutes: number }>;
}> = {
    'network-fundamentals': {
        name: 'Network Fundamentals',
        icon: '🌐',
        color: 'bg-blue-500',
        weight: 20,
        description: 'Learn the foundational concepts of networking including the OSI and TCP/IP models, IP addressing, subnetting, and essential protocols.',
        subtopics: [
            { id: 'osi-model', name: 'OSI Model Layers', difficulty: 'beginner', minutes: 15 },
            { id: 'tcp-ip-model', name: 'TCP/IP Model', difficulty: 'beginner', minutes: 12 },
            { id: 'ipv4-addressing', name: 'IPv4 Addressing', difficulty: 'beginner', minutes: 20 },
            { id: 'ipv6-addressing', name: 'IPv6 Addressing', difficulty: 'intermediate', minutes: 25 },
            { id: 'subnetting', name: 'Subnetting Basics', difficulty: 'intermediate', minutes: 30 },
            { id: 'vlsm-cidr', name: 'VLSM & CIDR', difficulty: 'intermediate', minutes: 25 },
            { id: 'network-cables', name: 'Network Cables & Connectors', difficulty: 'beginner', minutes: 10 },
            { id: 'network-topologies', name: 'Network Topologies', difficulty: 'beginner', minutes: 12 },
            { id: 'tcp-vs-udp', name: 'TCP vs UDP', difficulty: 'beginner', minutes: 15 },
            { id: 'arp-icmp', name: 'ARP & ICMP Protocols', difficulty: 'beginner', minutes: 12 },
        ],
    },
    'network-access': {
        name: 'Network Access',
        icon: '🔌',
        color: 'bg-green-500',
        weight: 20,
        description: 'Master switching concepts including VLANs, Spanning Tree Protocol, EtherChannel, and wireless networking fundamentals.',
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
        icon: '🛣️',
        color: 'bg-purple-500',
        weight: 25,
        description: 'Understand routing concepts, configure static and dynamic routing, and implement first-hop redundancy protocols.',
        subtopics: [
            { id: 'routing-fundamentals', name: 'Routing Fundamentals', difficulty: 'beginner', minutes: 15 },
            { id: 'static-routing', name: 'Static Routing', difficulty: 'beginner', minutes: 18 },
            { id: 'default-floating-routes', name: 'Default & Floating Routes', difficulty: 'intermediate', minutes: 15 },
            { id: 'ospf-single-area', name: 'OSPF Single Area', difficulty: 'intermediate', minutes: 30 },
            { id: 'ospf-multi-area', name: 'OSPF Multi-Area', difficulty: 'advanced', minutes: 25 },
            { id: 'administrative-distance', name: 'Administrative Distance', difficulty: 'intermediate', minutes: 12 },
            { id: 'hsrp-fhrp', name: 'First Hop Redundancy (HSRP)', difficulty: 'intermediate', minutes: 20 },
            { id: 'ipv6-routing', name: 'IPv6 Routing', difficulty: 'intermediate', minutes: 22 },
        ],
    },
    'ip-services': {
        name: 'IP Services',
        icon: '⚙️',
        color: 'bg-orange-500',
        weight: 10,
        description: 'Configure essential network services including DHCP, NAT, DNS, NTP, and network management protocols.',
        subtopics: [
            { id: 'dhcp-config', name: 'DHCP Configuration', difficulty: 'beginner', minutes: 18 },
            { id: 'dns-basics', name: 'DNS Basics', difficulty: 'beginner', minutes: 12 },
            { id: 'nat-types', name: 'NAT (Static, Dynamic, PAT)', difficulty: 'intermediate', minutes: 25 },
            { id: 'ntp-config', name: 'NTP Configuration', difficulty: 'beginner', minutes: 10 },
            { id: 'snmp-syslog', name: 'SNMP & Syslog', difficulty: 'intermediate', minutes: 18 },
            { id: 'qos-concepts', name: 'QoS Concepts', difficulty: 'intermediate', minutes: 15 },
            { id: 'ssh-config', name: 'SSH Configuration', difficulty: 'beginner', minutes: 12 },
        ],
    },
    'security-fundamentals': {
        name: 'Security Fundamentals',
        icon: '🔒',
        color: 'bg-red-500',
        weight: 15,
        description: 'Implement network security using access control lists, port security, and understand security best practices.',
        subtopics: [
            { id: 'standard-acls', name: 'Standard ACLs', difficulty: 'beginner', minutes: 18 },
            { id: 'extended-acls', name: 'Extended ACLs', difficulty: 'intermediate', minutes: 22 },
            { id: 'port-security', name: 'Port Security', difficulty: 'intermediate', minutes: 15 },
            { id: 'dhcp-snooping', name: 'DHCP Snooping', difficulty: 'intermediate', minutes: 15 },
            { id: 'aaa-concepts', name: 'AAA Concepts', difficulty: 'intermediate', minutes: 18 },
            { id: 'vpn-types', name: 'VPN Types', difficulty: 'intermediate', minutes: 15 },
            { id: 'wireless-security', name: 'Wireless Security (WPA2/WPA3)', difficulty: 'intermediate', minutes: 15 },
            { id: 'firewall-concepts', name: 'Firewall Concepts', difficulty: 'beginner', minutes: 12 },
        ],
    },
    'automation-programmability': {
        name: 'Automation & Programmability',
        icon: '🤖',
        color: 'bg-cyan-500',
        weight: 10,
        description: 'Explore network automation concepts, REST APIs, and configuration management tools.',
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
            <div className="text-center py-12">
                <div className="text-6xl mb-4">❓</div>
                <h1 className="text-2xl font-bold mb-4">Domain Not Found</h1>
                <Link href="/learn/topics" className="btn-primary">
                    Back to Topics
                </Link>
            </div>
        );
    }

    const totalMinutes = domain.subtopics.reduce((sum, t) => sum + t.minutes, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`${domain.color} rounded-xl p-8 text-white`}>
                <nav className="text-white/70 text-sm mb-4">
                    <Link href="/learn/topics" className="hover:text-white">Topics</Link>
                    <span className="mx-2">/</span>
                    <span className="text-white">{domain.name}</span>
                </nav>

                <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl">{domain.icon}</span>
                    <div>
                        <h1 className="text-3xl font-bold">{domain.name}</h1>
                        <p className="text-white/80">{domain.weight}% of CCNA exam</p>
                    </div>
                </div>

                <p className="text-white/90 mb-6">{domain.description}</p>

                <div className="flex gap-4 text-sm">
                    <div className="bg-white/20 px-4 py-2 rounded-lg">
                        <span className="font-bold">{domain.subtopics.length}</span> Topics
                    </div>
                    <div className="bg-white/20 px-4 py-2 rounded-lg">
                        <span className="font-bold">~{Math.round(totalMinutes / 60 * 10) / 10}</span> Hours
                    </div>
                </div>
            </div>

            {/* Topics Grid */}
            <div className="grid md:grid-cols-2 gap-4">
                {domain.subtopics.map((topic, index) => (
                    <Link
                        key={topic.id}
                        href={`/learn/topics/${domainId}/${topic.id}`}
                        className="card p-5 hover:shadow-lg transition-all hover:-translate-y-1 group"
                    >
                        <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 ${domain.color} bg-opacity-20 rounded-lg flex items-center justify-center text-lg font-bold`}>
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${topic.difficulty === 'beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            topic.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {topic.difficulty}
                                    </span>
                                    <span className="text-xs text-gray-400">{topic.minutes} min</span>
                                </div>
                                <h3 className="font-semibold group-hover:text-cisco-blue transition-colors">
                                    {topic.name}
                                </h3>
                            </div>
                            <span className="text-gray-400 group-hover:text-cisco-blue transition-colors">→</span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Related Resources */}
            <div className="card p-6">
                <h3 className="font-bold mb-4">🔗 Related Resources</h3>
                <div className="flex flex-wrap gap-3">
                    <Link href="/learn/quiz" className="btn-outline text-sm">
                        📝 Practice Quiz
                    </Link>
                    <Link href="/learn/flashcards" className="btn-outline text-sm">
                        🃏 Flashcards
                    </Link>
                    <Link href="/learn/labs" className="btn-outline text-sm">
                        💻 Hands-on Labs
                    </Link>
                    <Link href="/learn/tutor" className="btn-outline text-sm">
                        🤖 Ask AI Tutor
                    </Link>
                </div>
            </div>
        </div>
    );
}
