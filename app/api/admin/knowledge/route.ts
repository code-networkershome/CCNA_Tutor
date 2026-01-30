import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { knowledgeNodes } from '@/lib/db/schema';
import { eq, desc, and, sql, isNull } from 'drizzle-orm';
import { z } from 'zod';

// GET - List all knowledge nodes (including drafts) for admin
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const module = searchParams.get('module') || 'ccna';
        const status = searchParams.get('status');

        let conditions = and(
            eq(knowledgeNodes.module, module as any),
            isNull(knowledgeNodes.deletedAt)
        );

        if (status) {
            conditions = and(conditions, eq(knowledgeNodes.status, status as any));
        }

        const nodes = await db
            .select({
                id: knowledgeNodes.id,
                topic: knowledgeNodes.topic,
                subtopic: knowledgeNodes.subtopic,
                intent: knowledgeNodes.intent,
                status: knowledgeNodes.status,
                difficulty: knowledgeNodes.difficulty,
                generatedBy: knowledgeNodes.generatedBy,
                estimatedMinutes: knowledgeNodes.estimatedMinutes,
                updatedAt: knowledgeNodes.updatedAt,
            })
            .from(knowledgeNodes)
            .where(conditions)
            .orderBy(desc(knowledgeNodes.updatedAt))
            .limit(200);

        return NextResponse.json({ success: true, data: nodes });
    } catch (error) {
        console.error('Error fetching knowledge nodes:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch nodes' }, { status: 500 });
    }
}

// POST - Create new knowledge node
const createNodeSchema = z.object({
    topic: z.string().min(1),
    subtopic: z.string().optional(),
    intent: z.string().min(1),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    coreExplanation: z.string().min(10),
    mentalModel: z.string().min(10),
    wireLogic: z.string().min(10),
    cliExample: z.string().optional(),
    commonMistakes: z.array(z.string()).optional(),
    examNote: z.string().optional(),
    estimatedMinutes: z.number().min(1).max(120).optional(),
    publishImmediately: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const validated = createNodeSchema.parse(body);

        // Admin can publish directly without going through review
        const status = validated.publishImmediately ? 'published' : 'draft';

        const [newNode] = await db.insert(knowledgeNodes).values({
            module: 'ccna',
            topic: validated.topic,
            subtopic: validated.subtopic || null,
            intent: validated.intent,
            difficulty: validated.difficulty,
            coreExplanation: validated.coreExplanation,
            mentalModel: validated.mentalModel,
            wireLogic: validated.wireLogic,
            cliExample: validated.cliExample || null,
            commonMistakes: validated.commonMistakes || [],
            examNote: validated.examNote || null,
            estimatedMinutes: validated.estimatedMinutes || 10,
            status: status,
            generatedBy: 'human',
            publishedAt: validated.publishImmediately ? new Date() : null,
        }).returning();

        return NextResponse.json({ success: true, data: newNode });
    } catch (error) {
        console.error('Error creating knowledge node:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Failed to create node' }, { status: 500 });
    }
}

// PUT - Update knowledge node (content or status)
const updateNodeSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(['draft', 'approved', 'published', 'archived']).optional(),
    topic: z.string().min(1).optional(),
    subtopic: z.string().optional(),
    intent: z.string().min(1).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    coreExplanation: z.string().min(10).optional(),
    mentalModel: z.string().min(10).optional(),
    wireLogic: z.string().min(10).optional(),
    cliExample: z.string().optional(),
    commonMistakes: z.array(z.string()).optional(),
    examNote: z.string().optional(),
});

export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const validated = updateNodeSchema.parse(body);

        const { id, ...updates } = validated;

        // Add publishedAt if status is being set to published
        const finalUpdates: any = { ...updates, updatedAt: new Date() };
        if (updates.status === 'published') {
            finalUpdates.publishedAt = new Date();
        }

        const [updatedNode] = await db
            .update(knowledgeNodes)
            .set(finalUpdates)
            .where(eq(knowledgeNodes.id, id))
            .returning();

        if (!updatedNode) {
            return NextResponse.json({ success: false, error: 'Node not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedNode });
    } catch (error) {
        console.error('Error updating knowledge node:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Failed to update node' }, { status: 500 });
    }
}

// DELETE - Soft delete knowledge node
export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Node ID required' }, { status: 400 });
        }

        // Soft delete
        await db
            .update(knowledgeNodes)
            .set({ deletedAt: new Date() })
            .where(eq(knowledgeNodes.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting knowledge node:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete node' }, { status: 500 });
    }
}
