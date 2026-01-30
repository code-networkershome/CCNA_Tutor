'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
    activeUsers: number;
    activeToday: number;
    quizzesTaken: number;
    avgScore: number;
    totalNodes: number;
    publishedNodes: number;
    totalLabs: number;
    totalQuizzes: number;
}

interface RecentActivity {
    type: string;
    description: string;
    time: string;
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<AnalyticsData>({
        activeUsers: 0,
        activeToday: 0,
        quizzesTaken: 0,
        avgScore: 0,
        totalNodes: 0,
        publishedNodes: 0,
        totalLabs: 0,
        totalQuizzes: 0,
    });
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/admin/stats');
                const data = await response.json();
                if (data.success) {
                    setStats(data.data);

                    // Generate activity from stats
                    const activities: RecentActivity[] = [];
                    if (data.data.quizzesTaken > 0) {
                        activities.push({
                            type: 'quiz',
                            description: `${data.data.quizzesTaken} quiz attempts recorded`,
                            time: 'Total',
                        });
                    }
                    if (data.data.activeToday > 0) {
                        activities.push({
                            type: 'user',
                            description: `${data.data.activeToday} users active today`,
                            time: 'Today',
                        });
                    }

                    setRecentActivity(activities);
                }
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    // Calculate percentages for progress bars
    const contentReadiness = stats.totalNodes > 0
        ? Math.round((stats.publishedNodes / stats.totalNodes) * 100)
        : 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-gray-600 dark:text-gray-400">Platform usage and learning insights</p>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Users', value: stats.activeUsers.toString(), icon: '👥', color: 'bg-blue-500' },
                    { label: 'Active Today', value: stats.activeToday.toString(), icon: '📈', color: 'bg-green-500' },
                    { label: 'Quizzes Taken', value: stats.quizzesTaken.toString(), icon: '⚡', color: 'bg-orange-500' },
                    { label: 'Avg. Score', value: `${stats.avgScore}%`, icon: '🎯', color: 'bg-purple-500' },
                ].map(stat => (
                    <div key={stat.label} className="card p-5">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-2xl text-white`}>
                                {stat.icon}
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>



            <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">User Engagement</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Quiz Attempts</span>
                        <span className="font-bold">{stats.quizzesTaken}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Average Score</span>
                        <span className={`font-bold ${stats.avgScore >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                            {stats.avgScore}%
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Active Users Today</span>
                        <span className="font-bold">{stats.activeToday}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Engagement Rate</span>
                        <span className="font-bold">
                            {stats.activeUsers > 0
                                ? Math.round((stats.activeToday / stats.activeUsers) * 100)
                                : 0}%
                        </span>
                    </div>

                    <div className="pt-4 border-t dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Score Distribution</span>
                        </div>
                        <div className="flex gap-1 h-8">
                            {/* Visual representation of score */}
                            {[...Array(10)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 rounded ${(i + 1) * 10 <= stats.avgScore
                                        ? 'bg-cisco-blue'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                        }`}
                                />
                            ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>
            </div>


            {/* Recent Activity */}
            <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">Platform Activity</h2>
                {recentActivity.length > 0 ? (
                    <div className="space-y-3">
                        {recentActivity.map((activity, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${activity.type === 'quiz' ? 'bg-orange-100 text-orange-600' :
                                    activity.type === 'user' ? 'bg-blue-100 text-blue-600' :
                                        'bg-green-100 text-green-600'
                                    }`}>
                                    {activity.type === 'quiz' ? '⚡' : activity.type === 'user' ? '👤' : '📚'}
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">{activity.description}</div>
                                    <div className="text-sm text-gray-500">{activity.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No activity data yet. Users need to complete quizzes and labs.
                    </div>
                )}
            </div>
        </div >
    );
}
