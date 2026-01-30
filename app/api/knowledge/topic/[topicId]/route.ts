import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { knowledgeNodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Get a specific topic by its intent/slug
export async function GET(
    request: NextRequest,
    { params }: { params: { topicId: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { topicId } = params;

        const nodes = await db
            .select()
            .from(knowledgeNodes)
            .where(eq(knowledgeNodes.intent, topicId))
            .limit(1);

        if (nodes.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Topic not found',
                data: null,
            });
        }

        const node = nodes[0];

        return NextResponse.json({
            success: true,
            data: {
                id: node.id,
                topic: node.topic,
                subtopic: node.subtopic,
                intent: node.intent,
                coreExplanation: node.coreExplanation,
                mentalModel: node.mentalModel,
                wireLogic: node.wireLogic,
                cliExample: node.cliExample,
                commonMistakes: node.commonMistakes || [],
                examNote: node.examNote,
                estimatedMinutes: node.estimatedMinutes,
                difficulty: node.difficulty,
                status: node.status,
            },
        });
    } catch (error) {
        console.error('Topic fetch error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch topic' }, { status: 500 });
    }
}
