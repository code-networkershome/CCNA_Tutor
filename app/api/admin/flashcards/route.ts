import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { flashcards } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';

const flashcardSchema = z.object({
    front: z.string().min(1, 'Front text is required'),
    back: z.string().min(1, 'Back text is required'),
    topic: z.string().min(1, 'Topic is required'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
    tags: z.array(z.string()).optional(),
    status: z.enum(['draft', 'published']).default('draft'),
});

// GET - Fetch all flashcards for admin
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const allCards = await db
            .select()
            .from(flashcards)
            .orderBy(desc(flashcards.createdAt));

        return NextResponse.json({
            success: true,
            data: allCards,
        });
    } catch (error) {
        console.error('Error fetching flashcards:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch flashcards' }, { status: 500 });
    }
}

// POST - Create a new flashcard
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const parsed = flashcardSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: parsed.error.errors[0]?.message || 'Invalid data'
            }, { status: 400 });
        }

        const [newCard] = await db
            .insert(flashcards)
            .values({
                front: parsed.data.front,
                back: parsed.data.back,
                topic: parsed.data.topic,
                difficulty: parsed.data.difficulty,
                tags: parsed.data.tags || [],
                status: parsed.data.status,
                module: 'ccna',
            })
            .returning();

        return NextResponse.json({
            success: true,
            data: newCard,
        });
    } catch (error) {
        console.error('Error creating flashcard:', error);
        return NextResponse.json({ success: false, error: 'Failed to create flashcard' }, { status: 500 });
    }
}

// PUT - Update flashcard(s) - supports single and bulk updates
export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();

        // Check if this is a bulk operation
        if (body.bulkAction) {
            const { bulkAction, ids } = body;

            // Bulk update all cards
            if (bulkAction === 'publishAll') {
                await db.update(flashcards).set({ status: 'published' });
                return NextResponse.json({ success: true, message: 'All flashcards published' });
            }

            if (bulkAction === 'unpublishAll') {
                await db.update(flashcards).set({ status: 'draft' });
                return NextResponse.json({ success: true, message: 'All flashcards unpublished' });
            }

            if (bulkAction === 'deleteAll') {
                await db.delete(flashcards);
                return NextResponse.json({ success: true, message: 'All flashcards deleted' });
            }

            // Bulk update selected cards
            if (ids && Array.isArray(ids) && ids.length > 0) {
                if (bulkAction === 'publishSelected') {
                    await db.update(flashcards).set({ status: 'published' }).where(inArray(flashcards.id, ids));
                    return NextResponse.json({ success: true, message: `${ids.length} flashcards published` });
                }

                if (bulkAction === 'unpublishSelected') {
                    await db.update(flashcards).set({ status: 'draft' }).where(inArray(flashcards.id, ids));
                    return NextResponse.json({ success: true, message: `${ids.length} flashcards unpublished` });
                }

                if (bulkAction === 'deleteSelected') {
                    await db.delete(flashcards).where(inArray(flashcards.id, ids));
                    return NextResponse.json({ success: true, message: `${ids.length} flashcards deleted` });
                }
            }

            return NextResponse.json({ success: false, error: 'Invalid bulk action' }, { status: 400 });
        }

        // Single card update
        const { id, status, front, back, topic, difficulty } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
        }

        const updateData: Record<string, string> = {};
        if (status) updateData.status = status;
        if (front) updateData.front = front;
        if (back) updateData.back = back;
        if (topic) updateData.topic = topic;
        if (difficulty) updateData.difficulty = difficulty;

        await db
            .update(flashcards)
            .set(updateData)
            .where(eq(flashcards.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating flashcard:', error);
        return NextResponse.json({ success: false, error: 'Failed to update flashcard' }, { status: 500 });
    }
}

// DELETE - Delete a flashcard
export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
        }

        await db.delete(flashcards).where(eq(flashcards.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting flashcard:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete flashcard' }, { status: 500 });
    }
}
