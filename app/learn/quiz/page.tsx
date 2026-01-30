'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Quiz {
    id: string;
    title: string;
    description?: string;
    topics: string[];
    questionCount: number;
    timeLimit?: number;
    passingScore: number;
}

export default function QuizListPage() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const response = await fetch('/api/quiz?module=ccna');
                const data = await response.json();
                if (data.success) {
                    setQuizzes(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch quizzes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Practice Quizzes</h1>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="card p-6 animate-pulse">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Sample quizzes if none from API - All CCNA 200-301 Exam Topics
    const displayQuizzes: Quiz[] = quizzes.length > 0 ? quizzes : [
        // Network Fundamentals (20%)
        { id: '1', title: 'Network Fundamentals', description: 'OSI model, TCP/IP, and basic networking concepts', topics: ['OSI', 'TCP/IP'], questionCount: 10, timeLimit: 15, passingScore: 70 },
        { id: '2', title: 'IPv4 Addressing', description: 'IPv4 addressing, subnetting, and CIDR calculations', topics: ['IPv4', 'Subnetting'], questionCount: 15, timeLimit: 20, passingScore: 70 },
        { id: '3', title: 'IPv6 Fundamentals', description: 'IPv6 addressing, configuration, and migration', topics: ['IPv6'], questionCount: 10, timeLimit: 15, passingScore: 70 },

        // Network Access (20%)
        { id: '4', title: 'VLANs & Trunking', description: 'VLAN configuration and 802.1Q trunking', topics: ['VLAN', '802.1Q'], questionCount: 10, timeLimit: 12, passingScore: 70 },
        { id: '5', title: 'Spanning Tree Protocol', description: 'STP, RSTP, and loop prevention', topics: ['STP', 'RSTP'], questionCount: 10, timeLimit: 15, passingScore: 70 },
        { id: '6', title: 'EtherChannel', description: 'Link aggregation with LACP and PAgP', topics: ['EtherChannel', 'LACP'], questionCount: 8, timeLimit: 10, passingScore: 70 },
        { id: '7', title: 'Wireless Networking', description: 'WLAN fundamentals, WLC, and security', topics: ['Wireless', 'WLAN'], questionCount: 10, timeLimit: 12, passingScore: 70 },

        // IP Connectivity (25%)
        { id: '8', title: 'Static Routing', description: 'Static routes and default routing', topics: ['Routing', 'Static'], questionCount: 8, timeLimit: 10, passingScore: 70 },
        { id: '9', title: 'OSPF Routing', description: 'Single-area OSPF configuration and concepts', topics: ['OSPF'], questionCount: 12, timeLimit: 15, passingScore: 70 },
        { id: '10', title: 'First Hop Redundancy', description: 'HSRP, VRRP, and GLBP protocols', topics: ['FHRP', 'HSRP'], questionCount: 8, timeLimit: 10, passingScore: 70 },

        // IP Services (10%)
        { id: '11', title: 'NAT & PAT', description: 'Network Address Translation configuration', topics: ['NAT', 'PAT'], questionCount: 10, timeLimit: 12, passingScore: 70 },
        { id: '12', title: 'DHCP & DNS', description: 'DHCP server/client and DNS fundamentals', topics: ['DHCP', 'DNS'], questionCount: 8, timeLimit: 10, passingScore: 70 },
        { id: '13', title: 'NTP & SNMP', description: 'Network time and monitoring protocols', topics: ['NTP', 'SNMP'], questionCount: 8, timeLimit: 10, passingScore: 70 },
        { id: '14', title: 'QoS Fundamentals', description: 'Quality of Service concepts and marking', topics: ['QoS'], questionCount: 8, timeLimit: 10, passingScore: 70 },

        // Security Fundamentals (15%)
        { id: '15', title: 'Access Control Lists', description: 'Standard and Extended ACL configuration', topics: ['ACL', 'Security'], questionCount: 12, timeLimit: 15, passingScore: 70 },
        { id: '16', title: 'Port Security', description: 'Switch port security and DHCP snooping', topics: ['Port Security', 'DAI'], questionCount: 10, timeLimit: 12, passingScore: 70 },
        { id: '17', title: 'AAA & 802.1X', description: 'Authentication, Authorization, Accounting', topics: ['AAA', '802.1X'], questionCount: 8, timeLimit: 10, passingScore: 70 },
        { id: '18', title: 'VPN Fundamentals', description: 'Site-to-site VPN and remote access concepts', topics: ['VPN', 'IPSec'], questionCount: 8, timeLimit: 10, passingScore: 70 },

        // Automation & Programmability (10%)
        { id: '19', title: 'Network Automation', description: 'REST APIs, JSON, and automation tools', topics: ['Automation', 'API'], questionCount: 10, timeLimit: 12, passingScore: 70 },
        { id: '20', title: 'SDN & Controllers', description: 'Software-defined networking and Cisco DNA', topics: ['SDN', 'DNA Center'], questionCount: 8, timeLimit: 10, passingScore: 70 },
        { id: '21', title: 'Configuration Management', description: 'Ansible, Puppet, and Chef basics', topics: ['Ansible', 'DevOps'], questionCount: 8, timeLimit: 10, passingScore: 70 },

        // Practice Exams
        { id: '22', title: 'Mixed Review', description: 'Random questions from all CCNA topics', topics: ['Mixed'], questionCount: 20, timeLimit: 25, passingScore: 70 },
        { id: '23', title: 'CCNA Practice Exam 1', description: 'Full-length practice exam simulation', topics: ['Exam'], questionCount: 50, timeLimit: 60, passingScore: 70 },
        { id: '24', title: 'CCNA Practice Exam 2', description: 'Another full-length practice exam', topics: ['Exam'], questionCount: 50, timeLimit: 60, passingScore: 70 },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Practice Quizzes</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Test your knowledge with topic-specific quizzes
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayQuizzes.map((quiz) => (
                    <div key={quiz.id} className="card p-6 hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold mb-2">{quiz.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {quiz.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {quiz.topics.map((topic) => (
                                <span key={topic} className="badge-secondary">{topic}</span>
                            ))}
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                            <span>{quiz.questionCount} questions</span>
                            {quiz.timeLimit && <span>{quiz.timeLimit} min</span>}
                        </div>
                        <Link href={`/learn/quiz/${quiz.id}`} className="btn-primary w-full text-center">
                            Start Quiz
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
