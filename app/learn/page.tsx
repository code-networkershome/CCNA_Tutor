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
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back, Student</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">You are making great progress. Keep it up!</p>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Overall Progress */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-gray-700 flex justify-between items-start">
                    <div>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Overall Progress</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.quizStats?.passCount ? Math.min(100, stats.quizStats.passCount * 5) : 19}%</h3>
                        <p className="text-slate-400 text-xs mt-1">CCNA Complete</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                        <span className="text-lg">◎</span>
                    </div>
                </div>

                {/* Current Level */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-gray-700 flex justify-between items-start">
                    <div>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Current Level</p>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">CCNA Associate</h3>
                        <p className="text-slate-400 text-xs mt-1">Level {stats.level} In Progress</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <span className="text-lg">🏆</span>
                    </div>
                </div>

                {/* Study Streak */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-gray-700 flex justify-between items-start">
                    <div>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Study Streak</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stats.currentStreak}</h3>
                        <p className="text-slate-400 text-xs mt-1">Days</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                        <span className="text-lg">🔥</span>
                    </div>
                </div>

                {/* Next Action */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-gray-700 flex justify-between items-start">
                    <div>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Next Action</p>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Continue</h3>
                        <p className="text-slate-400 text-xs mt-1 truncate max-w-[120px]">Physical Interface and Cabling</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <span className="text-lg">⚡</span>
                    </div>
                </div>
            </div>

            {/* Main Journey Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-8">
                {/* Circular Progress (Simplified CSS) */}
                <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-gray-700" />
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={351} strokeDashoffset={351 - (351 * 0.47)} className="text-teal-600" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">47%</span>
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your CCNA Journey</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-lg">
                        You have completed 19% of the curriculum. Keep pushing forward to reach your certification goal.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                        <Link href="/learn/topics" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2">
                            <span>▶</span> Continue Learning
                        </Link>
                        <Link href="/learn/progress" className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2">
                            <span>📊</span> View Analytics
                        </Link>
                    </div>
                </div>
            </div>

            {/* Quick Actions Title */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-orange-500">⚡</span>
                    <h3 className="font-bold text-slate-900 dark:text-white">Quick Actions</h3>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <Link href="/learn/labs" className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow group">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            💻
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-900 dark:text-white">Resume Lab</h4>
                            <p className="text-xs text-slate-500">OSPF Configuration in progress</p>
                        </div>
                        <span className="text-slate-300">›</span>
                    </Link>

                    <Link href="/learn/quiz" className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow group">
                        <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center text-xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
                            ❓
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-900 dark:text-white">Take Practice Quiz</h4>
                            <p className="text-xs text-slate-500">10 questions, 15 minutes</p>
                        </div>
                        <span className="text-slate-300">›</span>
                    </Link>

                    <Link href="/learn/tutor" className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow group">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            🤖
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-900 dark:text-white">Ask AI Tutor</h4>
                            <p className="text-xs text-slate-500">Get instant explanations</p>
                        </div>
                        <span className="text-slate-300">›</span>
                    </Link>
                </div>
            </div>

            {/* Bottom Grid: Progress & Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Progress By Domain */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>📈</span> Progress by Domain
                        </h3>
                        <span className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">View All ↗</span>
                    </div>

                    <div className="space-y-6">
                        {ccnaTopics.slice(0, 4).map((topic, i) => (
                            <div key={topic}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{topic}</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{[33, 25, 40, 10][i]}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${['bg-indigo-500', 'bg-emerald-500', 'bg-teal-600', 'bg-blue-500'][i]}`}
                                        style={{ width: `${[33, 25, 40, 10][i]}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>clock</span> Recent Activity
                        </h3>
                        <span className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">View All ↗</span>
                    </div>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center flex-shrink-0">
                                📖
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Network Components</h4>
                                <p className="text-xs text-slate-500 mt-1">Completed: Explain the role and function of network components</p>
                                <p className="text-[10px] text-slate-400 mt-2">Jan 30 • 45m</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                                ✅
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Network Fundamentals Review</h4>
                                <p className="text-xs text-slate-500 mt-1">Scored 8/10 on quiz</p>
                                <p className="text-[10px] text-slate-400 mt-2">Jan 29 • 12m</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                💻
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Basic Router Configuration</h4>
                                <p className="text-xs text-slate-500 mt-1">Completed CLI lab exercise</p>
                                <p className="text-[10px] text-slate-400 mt-2">Jan 28 • 25m</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Study Statistics Row */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-gray-700">
                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <span>📊</span> Study Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-100 dark:divide-gray-700">
                    <div>
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-600">⏱</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">156</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Hours Studied</div>
                    </div>
                    <div>
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-600">❓</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">342</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Questions Answered</div>
                    </div>
                    <div>
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-600">🎯</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.quizStats?.passRate || 78}%</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Accuracy Rate</div>
                    </div>
                    <div>
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-600">📚</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">5</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Topics Completed</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
