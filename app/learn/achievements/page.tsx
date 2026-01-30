'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    xp: number;
    category: string;
    unlocked: boolean;
    unlockedAt?: string;
}

interface AchievementStats {
    unlocked: number;
    total: number;
    totalXP: number;
    percentComplete: number;
}

export default function AchievementsPage() {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [stats, setStats] = useState<AchievementStats | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAchievements();
    }, []);

    const fetchAchievements = async () => {
        try {
            const response = await fetch('/api/achievements');
            const data = await response.json();
            if (data.success) {
                setAchievements(data.data.achievements);
                setStats(data.data.stats);
                setCategories(data.data.categories);
            }
        } catch (error) {
            console.error('Failed to fetch achievements:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAchievements = selectedCategory === 'all'
        ? achievements
        : achievements.filter(a => a.category === selectedCategory);

    const unlockedFirst = [...filteredAchievements].sort((a, b) => {
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;
        return 0;
    });

    const categoryIcons: Record<string, string> = {
        learning: '📚',
        quiz: '📝',
        flashcard: '🃏',
        lab: '🔬',
        scenario: '🔧',
        streak: '🔥',
        mastery: '🏆',
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-cisco-blue border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">🏆 Achievements</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Track your learning milestones and earn rewards
                    </p>
                </div>
                <Link href="/learn" className="btn-outline">
                    ← Back
                </Link>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card p-4 text-center">
                        <div className="text-3xl font-bold text-cisco-blue">{stats.unlocked}</div>
                        <div className="text-sm text-gray-500">Unlocked</div>
                    </div>
                    <div className="card p-4 text-center">
                        <div className="text-3xl font-bold text-gray-600">{stats.total}</div>
                        <div className="text-sm text-gray-500">Total</div>
                    </div>
                    <div className="card p-4 text-center">
                        <div className="text-3xl font-bold text-green-600">{stats.totalXP}</div>
                        <div className="text-sm text-gray-500">XP Earned</div>
                    </div>
                    <div className="card p-4 text-center">
                        <div className="text-3xl font-bold text-purple-600">{stats.percentComplete}%</div>
                        <div className="text-sm text-gray-500">Complete</div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {stats && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-cisco-blue to-green-500 transition-all duration-500"
                        style={{ width: `${stats.percentComplete}%` }}
                    />
                </div>
            )}

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg transition-colors ${selectedCategory === 'all'
                            ? 'bg-cisco-blue text-white'
                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                >
                    All
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${selectedCategory === cat
                                ? 'bg-cisco-blue text-white'
                                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        <span>{categoryIcons[cat]}</span>
                        <span className="capitalize">{cat}</span>
                    </button>
                ))}
            </div>

            {/* Achievement Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unlockedFirst.map((achievement) => (
                    <div
                        key={achievement.id}
                        className={`card p-4 transition-all ${achievement.unlocked
                                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700'
                                : 'opacity-60 grayscale'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`text-4xl ${achievement.unlocked ? '' : 'opacity-50'}`}>
                                {achievement.icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold">{achievement.name}</h3>
                                    {achievement.unlocked && (
                                        <span className="text-green-600">✓</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {achievement.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs bg-cisco-blue/10 text-cisco-blue px-2 py-1 rounded">
                                        +{achievement.xp} XP
                                    </span>
                                    {achievement.unlocked && achievement.unlockedAt && (
                                        <span className="text-xs text-gray-500">
                                            {new Date(achievement.unlockedAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredAchievements.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">🎯</div>
                    <p className="text-gray-600">No achievements in this category yet.</p>
                </div>
            )}
        </div>
    );
}
