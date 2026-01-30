'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface TopicContent {
    id: string;
    topic: string;
    subtopic: string;
    intent: string;
    coreExplanation: string;
    mentalModel: string;
    wireLogic: string;
    cliExample: string | null;
    commonMistakes: string[];
    examNote: string;
    estimatedMinutes: number;
    difficulty: string;
    status: string;
}

// CCNA topic definitions for lookup
const TOPIC_DEFINITIONS: Record<string, { name: string; domain: string; domainName: string }> = {
    'osi-model': { name: 'OSI Model Layers', domain: 'network-fundamentals', domainName: 'Network Fundamentals' },
    'tcp-ip-model': { name: 'TCP/IP Model', domain: 'network-fundamentals', domainName: 'Network Fundamentals' },
    'ipv4-addressing': { name: 'IPv4 Addressing', domain: 'network-fundamentals', domainName: 'Network Fundamentals' },
    'ipv6-addressing': { name: 'IPv6 Addressing', domain: 'network-fundamentals', domainName: 'Network Fundamentals' },
    'subnetting': { name: 'Subnetting Basics', domain: 'network-fundamentals', domainName: 'Network Fundamentals' },
    'vlsm-cidr': { name: 'VLSM & CIDR', domain: 'network-fundamentals', domainName: 'Network Fundamentals' },
    'network-cables': { name: 'Network Cables & Connectors', domain: 'network-fundamentals', domainName: 'Network Fundamentals' },
    'network-topologies': { name: 'Network Topologies', domain: 'network-fundamentals', domainName: 'Network Fundamentals' },
    'tcp-vs-udp': { name: 'TCP vs UDP', domain: 'network-fundamentals', domainName: 'Network Fundamentals' },
    'arp-icmp': { name: 'ARP & ICMP Protocols', domain: 'network-fundamentals', domainName: 'Network Fundamentals' },
    'vlan-basics': { name: 'VLAN Basics', domain: 'network-access', domainName: 'Network Access' },
    'vlan-trunking': { name: 'VLAN Trunking (802.1Q)', domain: 'network-access', domainName: 'Network Access' },
    'dtp-vtp': { name: 'DTP & VTP', domain: 'network-access', domainName: 'Network Access' },
    'stp-basics': { name: 'Spanning Tree Protocol (STP)', domain: 'network-access', domainName: 'Network Access' },
    'rstp-pvst': { name: 'Rapid STP & PVST+', domain: 'network-access', domainName: 'Network Access' },
    'etherchannel': { name: 'EtherChannel (LACP/PAgP)', domain: 'network-access', domainName: 'Network Access' },
    'wireless-fundamentals': { name: 'Wireless Fundamentals', domain: 'network-access', domainName: 'Network Access' },
    'wlc-architecture': { name: 'WLC & AP Architecture', domain: 'network-access', domainName: 'Network Access' },
    'routing-fundamentals': { name: 'Routing Fundamentals', domain: 'ip-connectivity', domainName: 'IP Connectivity' },
    'static-routing': { name: 'Static Routing', domain: 'ip-connectivity', domainName: 'IP Connectivity' },
    'default-floating-routes': { name: 'Default & Floating Routes', domain: 'ip-connectivity', domainName: 'IP Connectivity' },
    'ospf-single-area': { name: 'OSPF Single Area', domain: 'ip-connectivity', domainName: 'IP Connectivity' },
    'ospf-multi-area': { name: 'OSPF Multi-Area', domain: 'ip-connectivity', domainName: 'IP Connectivity' },
    'administrative-distance': { name: 'Administrative Distance', domain: 'ip-connectivity', domainName: 'IP Connectivity' },
    'hsrp-fhrp': { name: 'First Hop Redundancy (HSRP)', domain: 'ip-connectivity', domainName: 'IP Connectivity' },
    'ipv6-routing': { name: 'IPv6 Routing', domain: 'ip-connectivity', domainName: 'IP Connectivity' },
    'dhcp-config': { name: 'DHCP Configuration', domain: 'ip-services', domainName: 'IP Services' },
    'dns-basics': { name: 'DNS Basics', domain: 'ip-services', domainName: 'IP Services' },
    'nat-types': { name: 'NAT (Static, Dynamic, PAT)', domain: 'ip-services', domainName: 'IP Services' },
    'ntp-config': { name: 'NTP Configuration', domain: 'ip-services', domainName: 'IP Services' },
    'snmp-syslog': { name: 'SNMP & Syslog', domain: 'ip-services', domainName: 'IP Services' },
    'qos-concepts': { name: 'QoS Concepts', domain: 'ip-services', domainName: 'IP Services' },
    'ssh-config': { name: 'SSH Configuration', domain: 'ip-services', domainName: 'IP Services' },
    'standard-acls': { name: 'Standard ACLs', domain: 'security-fundamentals', domainName: 'Security Fundamentals' },
    'extended-acls': { name: 'Extended ACLs', domain: 'security-fundamentals', domainName: 'Security Fundamentals' },
    'port-security': { name: 'Port Security', domain: 'security-fundamentals', domainName: 'Security Fundamentals' },
    'dhcp-snooping': { name: 'DHCP Snooping', domain: 'security-fundamentals', domainName: 'Security Fundamentals' },
    'aaa-concepts': { name: 'AAA Concepts', domain: 'security-fundamentals', domainName: 'Security Fundamentals' },
    'vpn-types': { name: 'VPN Types', domain: 'security-fundamentals', domainName: 'Security Fundamentals' },
    'wireless-security': { name: 'Wireless Security (WPA2/WPA3)', domain: 'security-fundamentals', domainName: 'Security Fundamentals' },
    'firewall-concepts': { name: 'Firewall Concepts', domain: 'security-fundamentals', domainName: 'Security Fundamentals' },
    'rest-apis': { name: 'REST APIs', domain: 'automation-programmability', domainName: 'Automation & Programmability' },
    'json-xml': { name: 'JSON & XML Data Formats', domain: 'automation-programmability', domainName: 'Automation & Programmability' },
    'cisco-dna-center': { name: 'Cisco DNA Center', domain: 'automation-programmability', domainName: 'Automation & Programmability' },
    'ansible-basics': { name: 'Ansible Basics', domain: 'automation-programmability', domainName: 'Automation & Programmability' },
    'python-networking': { name: 'Python for Networking', domain: 'automation-programmability', domainName: 'Automation & Programmability' },
    'controller-networking': { name: 'Controller-Based Networking', domain: 'automation-programmability', domainName: 'Automation & Programmability' },
};

export default function TopicDetailPage() {
    const params = useParams();
    const domain = params.domain as string;
    const topicId = params.topic as string;

    const [content, setContent] = useState<TopicContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const topicDef = TOPIC_DEFINITIONS[topicId];

    useEffect(() => {
        fetchContent();
    }, [topicId]);

    const fetchContent = async () => {
        setLoading(true);
        setError(null);

        try {
            // Try to fetch existing content
            const response = await fetch(`/api/knowledge/topic/${topicId}`);
            const data = await response.json();

            if (data.success && data.data) {
                setContent(data.data);
            } else {
                // Content doesn't exist, will show generate button
                setContent(null);
            }
        } catch (err) {
            console.error('Failed to fetch topic:', err);
            setError('Failed to load topic content');
        } finally {
            setLoading(false);
        }
    };

    const generateContent = async () => {
        if (!topicDef) return;

        setGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/knowledge/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topicId,
                    topicName: topicDef.name,
                    domain: topicDef.domainName,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setContent(data.data);
            } else {
                setError(data.error || 'Failed to generate content');
            }
        } catch (err) {
            console.error('Failed to generate content:', err);
            setError('Failed to generate content. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
        );
    }

    if (!topicDef) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">❓</div>
                <h1 className="text-2xl font-bold mb-4">Topic Not Found</h1>
                <Link href="/learn/topics" className="btn-primary">
                    Back to Topics
                </Link>
            </div>
        );
    }

    // Content doesn't exist yet - show generate option
    if (!content) {
        return (
            <div className="max-w-4xl mx-auto">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href="/learn/topics" className="hover:text-cisco-blue">Topics</Link>
                    <span>/</span>
                    <Link href={`/learn/topics/${domain}`} className="hover:text-cisco-blue">{topicDef.domainName}</Link>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-white">{topicDef.name}</span>
                </nav>

                <div className="card p-12 text-center">
                    <div className="text-6xl mb-4">📝</div>
                    <h1 className="text-2xl font-bold mb-2">{topicDef.name}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        This topic content hasn&apos;t been generated yet. Click below to generate comprehensive
                        learning content using AI based on the latest CCNA 200-301 exam objectives.
                    </p>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={generateContent}
                        disabled={generating}
                        className="btn-primary px-8 py-3 text-lg"
                    >
                        {generating ? (
                            <>
                                <span className="animate-spin inline-block mr-2">⏳</span>
                                Generating Content...
                            </>
                        ) : (
                            '🤖 Generate Learning Content'
                        )}
                    </button>

                    <p className="text-sm text-gray-500 mt-4">
                        This will take 10-15 seconds
                    </p>
                </div>
            </div>
        );
    }

    // Display content
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/learn/topics" className="hover:text-cisco-blue">Topics</Link>
                <span>/</span>
                <Link href={`/learn/topics/${domain}`} className="hover:text-cisco-blue">{topicDef.domainName}</Link>
                <span>/</span>
                <span className="text-gray-900 dark:text-white">{topicDef.name}</span>
            </nav>

            {/* Header */}
            <div className="border-b dark:border-gray-700 pb-6">
                <h1 className="text-3xl font-bold mb-4">{topicDef.name}</h1>
                <div className="flex gap-4 text-sm">
                    <span className={`px-3 py-1 rounded-full ${content.difficulty === 'beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            content.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {content.difficulty}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                        ⏱️ {content.estimatedMinutes} min read
                    </span>
                </div>
            </div>

            {/* Core Explanation */}
            <div className="prose dark:prose-invert max-w-none">
                <h2 className="flex items-center gap-2">
                    <span className="text-2xl">💡</span> Core Concept
                </h2>
                <div className="whitespace-pre-wrap">{content.coreExplanation}</div>
            </div>

            {/* Mental Model */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-cisco-blue p-6 rounded-r-lg">
                <h3 className="text-lg font-bold text-cisco-blue mb-2">🧠 Mental Model</h3>
                <p className="text-gray-700 dark:text-gray-300">{content.mentalModel}</p>
            </div>

            {/* Wire Logic */}
            <div className="prose dark:prose-invert max-w-none">
                <h3>🔌 How It Works (Technical Details)</h3>
                <div className="whitespace-pre-wrap">{content.wireLogic}</div>
            </div>

            {/* CLI Example */}
            {content.cliExample && (
                <div className="card bg-gray-900 text-gray-100 p-0 overflow-hidden">
                    <div className="bg-gray-800 px-4 py-2 text-sm font-mono text-gray-400 flex justify-between">
                        <span>💻 Configuration Example</span>
                        <button
                            onClick={() => navigator.clipboard.writeText(content.cliExample || '')}
                            className="hover:text-white"
                        >
                            📋 Copy
                        </button>
                    </div>
                    <pre className="p-4 overflow-x-auto">
                        <code>{content.cliExample}</code>
                    </pre>
                </div>
            )}

            {/* Common Mistakes & Exam Notes */}
            <div className="grid md:grid-cols-2 gap-6">
                {content.commonMistakes?.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-lg border border-red-100 dark:border-red-900/20">
                        <h3 className="font-bold text-red-600 mb-3">⚠️ Common Mistakes</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                            {content.commonMistakes.map((mistake, i) => (
                                <li key={i}>{mistake}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {content.examNote && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-lg border border-yellow-100 dark:border-yellow-900/20">
                        <h3 className="font-bold text-yellow-600 mb-2">📝 Exam Tip</h3>
                        <p className="text-gray-700 dark:text-gray-300">{content.examNote}</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-8 border-t dark:border-gray-700">
                <Link href={`/learn/topics/${domain}`} className="btn-outline">
                    ← Back to {topicDef.domainName}
                </Link>
                <Link href="/learn/tutor" className="btn-primary">
                    Ask AI Tutor About This →
                </Link>
            </div>
        </div>
    );
}
