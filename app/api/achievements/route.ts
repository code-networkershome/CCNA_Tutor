import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';

// Achievement definitions
const ACHIEVEMENTS = [
    // Learning milestones
    { id: 'first_question', name: 'Curious Mind', description: 'Ask your first question to the AI Tutor', icon: '🤔', xp: 10, category: 'learning' },
    { id: 'ten_questions', name: 'Knowledge Seeker', description: 'Ask 10 questions to the AI Tutor', icon: '📚', xp: 50, category: 'learning' },
    { id: 'fifty_questions', name: 'Study Master', description: 'Ask 50 questions to the AI Tutor', icon: '🎓', xp: 100, category: 'learning' },
    { id: 'socratic_learner', name: 'Socratic Learner', description: 'Complete 5 Socratic mode sessions', icon: '💭', xp: 30, category: 'learning' },

    // Quiz achievements
    { id: 'first_quiz', name: 'Quiz Beginner', description: 'Complete your first quiz', icon: '✅', xp: 20, category: 'quiz' },
    { id: 'perfect_score', name: 'Perfect Score', description: 'Get 100% on any quiz', icon: '💯', xp: 100, category: 'quiz' },
    { id: 'ten_quizzes', name: 'Quiz Champion', description: 'Complete 10 quizzes', icon: '🏆', xp: 75, category: 'quiz' },
    { id: 'passing_streak_5', name: 'On a Roll', description: 'Pass 5 quizzes in a row', icon: '🔥', xp: 50, category: 'quiz' },

    // Flashcard achievements
    { id: 'first_flashcard', name: 'Card Flipper', description: 'Study your first flashcard', icon: '🃏', xp: 10, category: 'flashcard' },
    { id: 'flashcard_streak_7', name: 'Daily Reviewer', description: 'Study flashcards 7 days in a row', icon: '📅', xp: 75, category: 'flashcard' },
    { id: 'hundred_reviews', name: 'Memory Master', description: 'Review 100 flashcards', icon: '🧠', xp: 100, category: 'flashcard' },

    // Lab achievements
    { id: 'first_lab', name: 'Lab Rat', description: 'Complete your first lab', icon: '🔬', xp: 25, category: 'lab' },
    { id: 'five_labs', name: 'Lab Expert', description: 'Complete 5 labs', icon: '🥼', xp: 75, category: 'lab' },

    // Scenario achievements
    { id: 'first_scenario', name: 'Troubleshooter', description: 'Complete your first troubleshooting scenario', icon: '🔧', xp: 30, category: 'scenario' },
    { id: 'scenario_master', name: 'Scenario Master', description: 'Complete 10 troubleshooting scenarios', icon: '🛠️', xp: 100, category: 'scenario' },

    // Streak achievements
    { id: 'streak_3', name: 'Getting Started', description: 'Maintain a 3-day study streak', icon: '⭐', xp: 25, category: 'streak' },
    { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day study streak', icon: '🌟', xp: 50, category: 'streak' },
    { id: 'streak_30', name: 'Month Master', description: 'Maintain a 30-day study streak', icon: '💫', xp: 200, category: 'streak' },

    // Topic mastery
    { id: 'ospf_master', name: 'OSPF Master', description: 'Achieve 80%+ mastery in OSPF topics', icon: '🛣️', xp: 100, category: 'mastery' },
    { id: 'vlan_master', name: 'VLAN Virtuoso', description: 'Achieve 80%+ mastery in VLAN topics', icon: '🔀', xp: 100, category: 'mastery' },
    { id: 'security_master', name: 'Security Sentinel', description: 'Achieve 80%+ mastery in Security topics', icon: '🔐', xp: 100, category: 'mastery' },
    { id: 'subnetting_pro', name: 'Subnetting Pro', description: 'Achieve 80%+ mastery in Subnetting', icon: '🧮', xp: 100, category: 'mastery' },
];

// Simple in-memory storage for achievements (in production, use database)
const userAchievements: Record<string, { id: string; unlockedAt: string }[]> = {};

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's unlocked achievements
        const unlocked = userAchievements[user.id] || [];
        const unlockedIds = new Set(unlocked.map(a => a.id));

        // Combine with achievement definitions
        const achievements = ACHIEVEMENTS.map(a => ({
            ...a,
            unlocked: unlockedIds.has(a.id),
            unlockedAt: unlocked.find(u => u.id === a.id)?.unlockedAt,
        }));

        // Calculate stats
        const unlockedCount = achievements.filter(a => a.unlocked).length;
        const totalXP = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0);

        return NextResponse.json({
            success: true,
            data: {
                achievements,
                stats: {
                    unlocked: unlockedCount,
                    total: ACHIEVEMENTS.length,
                    totalXP,
                    percentComplete: Math.round((unlockedCount / ACHIEVEMENTS.length) * 100),
                },
                categories: ['learning', 'quiz', 'flashcard', 'lab', 'scenario', 'streak', 'mastery'],
            },
        });
    } catch (error) {
        console.error('Achievements GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch achievements' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { achievementId, action } = body;

        if (action === 'check') {
            // Check if user qualifies for any new achievements based on their activity
            const newAchievements = await checkForNewAchievements(user.id);
            return NextResponse.json({
                success: true,
                data: { newAchievements },
            });
        }

        if (action === 'unlock' && achievementId) {
            // Unlock specific achievement
            const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
            if (!achievement) {
                return NextResponse.json({ success: false, error: 'Achievement not found' }, { status: 404 });
            }

            // Check if already unlocked
            if (!userAchievements[user.id]) {
                userAchievements[user.id] = [];
            }

            if (userAchievements[user.id].some(a => a.id === achievementId)) {
                return NextResponse.json({
                    success: true,
                    data: { alreadyUnlocked: true },
                });
            }

            // Unlock achievement
            userAchievements[user.id].push({
                id: achievementId,
                unlockedAt: new Date().toISOString(),
            });

            return NextResponse.json({
                success: true,
                data: {
                    unlocked: true,
                    achievement,
                    message: `🏆 Achievement Unlocked: ${achievement.name}!`,
                },
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Achievements POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to process achievement' }, { status: 500 });
    }
}

async function checkForNewAchievements(userId: string): Promise<typeof ACHIEVEMENTS> {
    // This would check user stats and unlock appropriate achievements
    // For now, return empty array - actual implementation would query DB
    const newAchievements: typeof ACHIEVEMENTS = [];

    // Example: Check for first_question achievement
    // const queryCount = await getQueryCount(userId);
    // if (queryCount >= 1 && !isUnlocked('first_question')) unlock('first_question');

    return newAchievements;
}
