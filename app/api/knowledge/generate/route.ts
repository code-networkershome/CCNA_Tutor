import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { generateChatCompletion } from '@/lib/llm/provider';
import { db } from '@/lib/db';
import { knowledgeNodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Generate CCNA topic content using LLM
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { topicId, topicName, domain } = body;

        if (!topicId || !topicName || !domain) {
            return NextResponse.json({
                success: false,
                error: 'topicId, topicName, and domain are required'
            }, { status: 400 });
        }

        // Check if content already exists
        const existing = await db
            .select()
            .from(knowledgeNodes)
            .where(eq(knowledgeNodes.intent, topicId))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json({
                success: true,
                data: formatKnowledgeNode(existing[0]),
                source: 'database',
            });
        }

        // Generate content using LLM
        const systemPrompt = `You are an expert CCNA instructor creating comprehensive study material for the CCNA 200-301 certification exam.

Generate structured learning content for the following topic. The content should be:
- Accurate and up-to-date with current Cisco CCNA exam objectives
- Practical with real-world examples
- Include Cisco IOS command examples where applicable
- Suitable for someone preparing for the CCNA certification

Respond ONLY with valid JSON in this exact format:
{
    "coreExplanation": "A comprehensive 3-5 paragraph explanation of the concept, its purpose, and importance in networking",
    "mentalModel": "A real-world analogy or mental model to help understand this concept (e.g., comparing NAT to a receptionist forwarding calls)",
    "wireLogic": "Technical details about how this works at the packet/frame level, including protocols and processes involved",
    "cliExample": "Cisco IOS CLI commands to configure this feature. Include comments. Use realistic examples.",
    "commonMistakes": ["Mistake 1 that students often make", "Mistake 2", "Mistake 3"],
    "examNote": "What Cisco specifically tests about this topic on the CCNA exam - key facts, port numbers, or concepts to memorize",
    "difficulty": "beginner OR intermediate OR advanced",
    "estimatedMinutes": 15
}`;

        const userPrompt = `Generate comprehensive CCNA study content for:

Topic: ${topicName}
Domain: ${domain}
Topic ID: ${topicId}

This is part of the CCNA 200-301 certification curriculum. Generate complete, accurate, and helpful content.`;

        const llmResponse = await generateChatCompletion(systemPrompt, userPrompt, {
            temperature: 0.7
        });

        let parsed;
        try {
            parsed = JSON.parse(llmResponse);
        } catch (e) {
            console.error('Failed to parse LLM response:', llmResponse);
            return NextResponse.json({
                success: false,
                error: 'Failed to generate valid content'
            }, { status: 500 });
        }

        // Save to database
        const [newNode] = await db.insert(knowledgeNodes).values({
            topic: domain,
            subtopic: topicName,
            intent: topicId,
            coreExplanation: parsed.coreExplanation || '',
            mentalModel: parsed.mentalModel || '',
            wireLogic: parsed.wireLogic || '',
            cliExample: parsed.cliExample || null,
            commonMistakes: parsed.commonMistakes || [],
            examNote: parsed.examNote || null,
            difficulty: parsed.difficulty || 'intermediate',
            estimatedMinutes: parsed.estimatedMinutes || 15,
            module: 'ccna',
            status: 'published',
            generatedBy: 'llm',
        }).returning();

        return NextResponse.json({
            success: true,
            data: formatKnowledgeNode(newNode),
            source: 'generated',
        });

    } catch (error) {
        console.error('Knowledge generation error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to generate content'
        }, { status: 500 });
    }
}

function formatKnowledgeNode(node: any) {
    return {
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
    };
}
