import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { knowledgeNodes, labs, questions } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// GET - Fetch AI-generated items pending review (draft status, LLM-generated only)
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        // Fetch draft knowledge nodes that are LLM-generated (not admin-created)
        const draftNodes = await db
            .select({
                id: knowledgeNodes.id,
                title: knowledgeNodes.topic,
                intent: knowledgeNodes.intent,
                type: knowledgeNodes.module,
                status: knowledgeNodes.status,
                generatedBy: knowledgeNodes.generatedBy,
                createdAt: knowledgeNodes.createdAt,
            })
            .from(knowledgeNodes)
            .where(and(
                eq(knowledgeNodes.status, 'draft'),
                eq(knowledgeNodes.generatedBy, 'llm')
            ))
            .orderBy(desc(knowledgeNodes.createdAt))
            .limit(50);

        // Fetch draft labs
        const draftLabs = await db
            .select({
                id: labs.id,
                title: labs.title,
                type: labs.topic,
                status: labs.status,
                createdAt: labs.createdAt,
            })
            .from(labs)
            .where(eq(labs.status, 'draft'))
            .orderBy(desc(labs.createdAt))
            .limit(50);

        // Combine and format for review queue
        const reviewItems = [
            ...draftNodes.map(n => ({
                id: n.id,
                title: n.intent || n.title,
                type: 'knowledge' as const,
                status: 'pending' as const,
                submittedAt: n.createdAt?.toISOString() || new Date().toISOString(),
                submittedBy: 'AI (LLM)',
            })),
            ...draftLabs.map(l => ({
                id: l.id,
                title: l.title,
                type: 'lab' as const,
                status: 'pending' as const,
                submittedAt: l.createdAt?.toISOString() || new Date().toISOString(),
                submittedBy: 'Admin',
            })),
        ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        return NextResponse.json({
            success: true,
            data: reviewItems,
        });
    } catch (error) {
        console.error('Error fetching review queue:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch review queue' }, { status: 500 });
    }
}

// PUT - Approve or reject an item
export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { id, type, action } = body;

        if (!id || !type || !action) {
            return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
        }

        const newStatus = action === 'approve' ? 'published' : 'archived';

        if (type === 'knowledge') {
            await db.update(knowledgeNodes)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(knowledgeNodes.id, id));
        } else if (type === 'lab') {
            await db.update(labs)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(labs.id, id));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating review item:', error);
        return NextResponse.json({ success: false, error: 'Failed to update item' }, { status: 500 });
    }
}
