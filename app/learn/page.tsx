'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProgressStats {
    currentStreak: number;
    totalTimeSpent: number;
    level: number;
    experiencePoints: number;
    topicsCompleted: number;
    email?: string;
    quizStats?: {
        totalTaken: number;
        avgScore: number;
        passCount: number;
        passRate: number;
    };
    labStats?: {
        totalAttempted: number;
        completed: number;
    };
    recentQuizzes?: Array<{
        id: string;
        score: number;
        passed: boolean;
        completedAt: string;
    }>;
}

interface TopicProgress {
    topic: string;
    progress: number;
}

const ccnaTopics = [
    'Network Fundamentals',
    'Network Access',
    'IP Connectivity',
    'IP Services',
    'Security Fundamentals',
    'Automation & Programmability',
];

// Initialize with defaults so page shows immediately
const defaultStats: ProgressStats = {
    currentStreak: 0,
    totalTimeSpent: 0,
    level: 1,
    experiencePoints: 0,
    topicsCompleted: 0,
};

export default function LearnHomePage() {
    const [stats, setStats] = useState<ProgressStats>(defaultStats);
    const [loading, setLoading] = useState(false); // Start false so content shows immediately

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const response = await fetch('/api/progress');
                const data = await response.json();

                if (data.success) {
                    setStats({
                        currentStreak: data.data.currentStreak || 0,
                        totalTimeSpent: data.data.totalTimeSpent || 0,
                        level: data.data.level || 1,
                        experiencePoints: data.data.experiencePoints || 0,
                        topicsCompleted: data.data.topicsCompleted || 0,
                        email: data.data.email,
                        quizStats: data.data.quizStats,
                        labStats: data.data.labStats,
                        recentQuizzes: data.data.recentQuizzes,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch progress:', error);
            }
        };

        fetchProgress();
    }, []);

    const quickActions = [
        {
            href: '/learn/tutor',
            icon: '🤖',
            title: 'Ask AI Tutor',
            description: 'Get instant answers with Voice & Socratic modes',
            color: 'bg-blue-500',
        },
        {
            href: '/learn/quiz',
            icon: '⚡',
            title: 'Quick Quiz',
            description: 'Test your knowledge with practice questions',
            color: 'bg-green-500',
        },
        {
            href: '/learn/flashcards',
            icon: '🎴',
            title: 'Smart Flashcards',
            description: 'Spaced repetition for optimal learning',
            color: 'bg-purple-500',
        },
        {
            href: '/learn/scenarios',
            icon: '🔧',
            title: 'Troubleshooting',
            description: 'Interactive network problem solving',
            color: 'bg-red-500',
        },
        {
            href: '/learn/study-session',
            icon: '🍅',
            title: 'Study Session',
            description: 'Pomodoro timer for focused learning',
            color: 'bg-orange-500',
        },
        {
            href: '/learn/achievements',
            icon: '🏆',
            title: 'Achievements',
            description: 'Track your learning milestones',
            color: 'bg-yellow-500',
        },
        {
            href: '/learn/labs',
            icon: '💻',
            title: 'Practice Labs',
            description: 'Hands-on CLI and topology exercises',
            color: 'bg-cyan-500',
        },
        {
            href: '/learn/exam',
            icon: '📝',
            title: 'Practice Exams',
            description: 'Full-length CCNA practice tests',
            color: 'bg-indigo-500',
        },
    ];

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-cisco-blue to-primary-600 rounded-xl p-8 text-white">
                <h1 className="text-3xl font-bold mb-2">Welcome Back! 👋</h1>
                <p className="text-white/80 mb-6">
                    Ready to continue your CCNA journey? You&apos;re doing great!
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 rounded-lg p-4">
                        <div className="text-3xl font-bold">{stats.currentStreak}🔥</div>
                        <div className="text-sm text-white/70">Day Streak</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                        <div className="text-3xl font-bold">Lvl {stats.level}</div>
                        <div className="text-sm text-white/70">{stats.experiencePoints} XP</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                        <div className="text-3xl font-bold">{stats.quizStats?.totalTaken || 0}</div>
                        <div className="text-sm text-white/70">Quizzes Taken</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                        <div className="text-3xl font-bold">{stats.quizStats?.avgScore || 0}%</div>
                        <div className="text-sm text-white/70">Avg Score</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-bold mb-4">Quick Start</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className="card p-5 hover:shadow-lg transition-all hover:-translate-y-1 group"
                        >
                            <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                                {action.icon}
                            </div>
                            <h3 className="font-semibold mb-1">{action.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Stats Overview */}
            {stats?.quizStats && (
                <div>
                    <h2 className="text-xl font-bold mb-4">Your Progress</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="card p-5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-2xl text-white">
                                    ⚡
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{stats.quizStats.passRate}%</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Pass Rate</div>
                                </div>
                            </div>
                        </div>
                        <div className="card p-5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl text-white">
                                    ✅
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{stats.quizStats.passCount}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Quizzes Passed</div>
                                </div>
                            </div>
                        </div>
                        <div className="card p-5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-2xl text-white">
                                    💻
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{stats.labStats?.completed || 0}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Labs Completed</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            {stats?.recentQuizzes && stats.recentQuizzes.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                    <div className="card divide-y dark:divide-gray-700">
                        {stats.recentQuizzes.map((quiz) => (
                            <div key={quiz.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{quiz.passed ? '✅' : '📚'}</span>
                                    <div>
                                        <div className="font-medium">Quiz Completed</div>
                                        <div className="text-sm text-gray-500">
                                            {quiz.completedAt ? new Date(quiz.completedAt).toLocaleDateString() : 'Just now'}
                                        </div>
                                    </div>
                                </div>
                                <div className={`font-bold ${quiz.passed ? 'text-green-600' : 'text-red-600'}`}>
                                    {quiz.score}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Continue Learning */}
            <div className="card p-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-cisco-blue/20">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-cisco-blue rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                        📖
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold">Continue Your Study</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Pick up where you left off and keep building your knowledge.
                        </p>
                    </div>
                    <Link href="/learn/exam" className="btn-primary flex-shrink-0">
                        Take Exam
                    </Link>
                </div>
            </div>
        </div>
    );
}
