'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
    totalNodes: number;
    publishedNodes: number;
    draftNodes: number;
    pendingReview: number;
    totalQuizzes: number;
    totalLabs: number;
    activeUsers: number;
    generationJobs: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/admin/stats');
                const data = await response.json();
                if (data.success) {
                    setStats(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statCards = [
        { label: 'Total Knowledge Nodes', value: stats?.totalNodes, icon: '📚', color: 'bg-blue-500', href: '/dashboard/knowledge' },
        { label: 'Published', value: stats?.publishedNodes, icon: '✅', color: 'bg-green-500', href: '/dashboard/knowledge?status=published' },
        { label: 'Draft Nodes', value: stats?.draftNodes, icon: '📝', color: 'bg-gray-500', href: '/dashboard/knowledge?status=draft' },
        { label: 'Active Users', value: stats?.activeUsers, icon: '👥', color: 'bg-purple-500', href: '/dashboard/users' },
        { label: 'Quizzes', value: stats?.totalQuizzes, icon: '⚡', color: 'bg-orange-500', href: '/dashboard/quizzes' },
        { label: 'Labs', value: stats?.totalLabs, icon: '💻', color: 'bg-cyan-500', href: '/dashboard/labs' },
    ];

    const quickActions = [
        { label: 'Generate Knowledge', href: '/dashboard/generation', icon: '🤖' },
        { label: 'Review Queue', href: '/dashboard/review', icon: '✅' },
        { label: 'Create Quiz', href: '/dashboard/quizzes/new', icon: '➕' },
        { label: 'View Analytics', href: '/dashboard/analytics', icon: '📈' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage knowledge, quizzes, and monitor system health</p>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statCards.map((stat) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="card p-5 hover:shadow-lg transition-all hover:-translate-y-1"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-2xl text-white`}>
                                {stat.icon}
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {loading ? (
                                        <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                    ) : (
                                        stat.value?.toLocaleString() || '0'
                                    )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-3">
                    {quickActions.map((action) => (
                        <Link key={action.label} href={action.href} className="btn-outline flex items-center gap-2">
                            <span>{action.icon}</span>
                            <span>{action.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Activity & System Status */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* System Status */}
                <div className="card">
                    <div className="p-4 border-b dark:border-gray-700">
                        <h2 className="font-semibold">System Status</h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {[
                            { label: 'Database', status: 'Connected', color: 'bg-green-500' },
                            { label: 'Auth Service', status: 'Online', color: 'bg-green-500' },
                            { label: 'LLM Provider', status: 'Ready', color: 'bg-green-500' },
                        ].map((service) => (
                            <div key={service.label} className="flex items-center justify-between">
                                <span className="text-sm font-medium">{service.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${service.color}`} />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{service.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Generation Jobs */}
            {(stats?.generationJobs ?? 0) > 0 && (
                <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border-cisco-blue/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin h-5 w-5 border-2 border-cisco-blue border-t-transparent rounded-full" />
                            <div>
                                <span className="font-medium">{stats?.generationJobs ?? 0} generation jobs running</span>
                            </div>
                        </div>
                        <Link href="/dashboard/generation" className="btn-primary btn-sm">
                            View Jobs
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
