import { db } from './index';
import { userProgress, topicProgress } from './schema';
import { eq, and } from 'drizzle-orm';

// Get user progress
export async function getUserProgress(userId: string) {
    try {
        const [progress] = await db
            .select()
            .from(userProgress)
            .where(and(
                eq(userProgress.userId, userId),
                eq(userProgress.module, 'ccna')
            ))
            .limit(1);
        return progress;
    } catch (error) {
        console.error('Error getting user progress:', error);
        return null;
    }
}

// Initialize user progress - aligned with schema
export async function initializeUserProgress(userId: string) {
    try {
        const [progress] = await db
            .insert(userProgress)
            .values({
                userId,
                module: 'ccna',
                currentStreak: 0,
                longestStreak: 0,
                totalTimeSpent: 0,
                level: 1,
                experiencePoints: 0,
                // Note: topicsCompleted doesn't exist in schema, removed
            })
            .onConflictDoNothing()
            .returning();
        return progress;
    } catch (error) {
        console.error('Error initializing user progress:', error);
        return null;
    }
}

// Get topic progress for user
export async function getTopicProgressForUser(userId: string) {
    try {
        const progress = await db
            .select()
            .from(topicProgress)
            .where(and(
                eq(topicProgress.userId, userId),
                eq(topicProgress.module, 'ccna')
            ));
        return progress;
    } catch (error) {
        console.error('Error getting topic progress:', error);
        return [];
    }
}

// Update user progress - aligned with schema fields
export async function updateUserProgress(
    userId: string,
    updates: {
        experiencePoints?: number;
        totalTimeSpent?: number;
        currentStreak?: number;
        longestStreak?: number;
        level?: number;
    }
) {
    try {
        const [progress] = await db
            .update(userProgress)
            .set({
                ...updates,
                lastActivityAt: new Date(),
                updatedAt: new Date(),
            })
            .where(and(
                eq(userProgress.userId, userId),
                eq(userProgress.module, 'ccna')
            ))
            .returning();
        return progress;
    } catch (error) {
        console.error('Error updating user progress:', error);
        return null;
    }
}
