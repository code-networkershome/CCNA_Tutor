import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { generationJobs, knowledgeNodes } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
});

const GENERATION_PROMPT = `You are a CCNA knowledge expert. Generate a comprehensive knowledge node for the given topic.

Return a JSON object with this exact structure:
{
    "topic": "Topic name",
    "intent": "What the user wants to learn",
    "module": "ccna",
    "coreExplanation": "Main explanation of the concept (2-3 paragraphs)",
    "mentalModel": "A helpful analogy or mental framework to understand this",
    "wireLogic": "What happens at the network/packet level",
    "cliExample": "Relevant Cisco CLI commands with explanation",
    "commonMistakes": ["Array of common mistakes students make"],
    "examNote": "Important points for the CCNA exam",
    "prerequisites": ["Array of prerequisite topics"]
}

Be thorough, accurate, and exam-focused.`;

// GET - Fetch all generation jobs
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const jobs = await db
            .select()
            .from(generationJobs)
            .orderBy(desc(generationJobs.createdAt))
            .limit(50);

        return NextResponse.json({
            success: true,
            data: jobs.map(job => ({
                id: job.id,
                topics: job.topics,
                status: job.status,
                progress: job.totalNodes > 0
                    ? Math.round((job.completedNodes / job.totalNodes) * 100)
                    : 0,
                model: job.model,
                createdAt: job.createdAt?.toISOString(),
                completedAt: job.completedAt?.toISOString(),
                error: (job.errorLog as any[])?.length > 0
                    ? (job.errorLog as string[]).join('; ')
                    : null,
            })),
        });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch jobs' }, { status: 500 });
    }
}

// POST - Create a new generation job and process it
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { topics, model = 'llama-3.1-8b-instant', temperature = 0.3 } = body;

        if (!topics || !Array.isArray(topics) || topics.length === 0) {
            return NextResponse.json({ success: false, error: 'Topics required' }, { status: 400 });
        }

        // Create job record
        const [job] = await db
            .insert(generationJobs)
            .values({
                topics,
                model,
                temperature: String(temperature),
                status: 'running',
                totalNodes: topics.length,
                completedNodes: 0,
                createdBy: user.id,
            })
            .returning();

        // Process in background (fire and forget)
        processGenerationJob(job.id, topics, model, temperature);

        return NextResponse.json({
            success: true,
            data: {
                id: job.id,
                status: 'running',
            },
        });
    } catch (error) {
        console.error('Error creating job:', error);
        return NextResponse.json({ success: false, error: 'Failed to create job' }, { status: 500 });
    }
}

async function processGenerationJob(
    jobId: string,
    topics: string[],
    model: string,
    temperature: number
) {
    let completed = 0;
    let errors: string[] = [];

    try {
        for (const topic of topics) {
            try {
                // Generate content using Groq
                const completion = await groq.chat.completions.create({
                    model,
                    messages: [
                        { role: 'system', content: GENERATION_PROMPT },
                        { role: 'user', content: `Generate a knowledge node for: ${topic}` },
                    ],
                    temperature,
                    max_tokens: 2000,
                });

                const content = completion.choices[0]?.message?.content || '';

                // Parse JSON response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);

                    // Insert knowledge node - published directly (admin initiated)
                    await db.insert(knowledgeNodes).values({
                        topic: parsed.topic || topic,
                        intent: parsed.intent || `Learn about ${topic}`,
                        module: 'ccna',
                        coreExplanation: parsed.coreExplanation || '',
                        mentalModel: parsed.mentalModel || '',
                        wireLogic: parsed.wireLogic || '',
                        cliExample: parsed.cliExample || null,
                        commonMistakes: parsed.commonMistakes || [],
                        examNote: parsed.examNote || null,
                        prerequisites: parsed.prerequisites || [],
                        status: 'published',
                        generatedBy: 'llm',
                        publishedAt: new Date(),
                    });
                }

                completed++;

                // Update progress
                await db.update(generationJobs)
                    .set({ completedNodes: completed })
                    .where(eq(generationJobs.id, jobId));

            } catch (topicError: any) {
                errors.push(`${topic}: ${topicError.message}`);
            }
        }

        // Mark job as completed
        await db.update(generationJobs)
            .set({
                status: errors.length > 0 ? 'failed' : 'completed',
                completedNodes: completed,
                failedNodes: errors.length,
                completedAt: new Date(),
                errorLog: errors,
            })
            .where(eq(generationJobs.id, jobId));

    } catch (error: any) {
        // Mark job as failed
        await db.update(generationJobs)
            .set({
                status: 'failed',
                errorLog: [error.message],
                completedAt: new Date(),
            })
            .where(eq(generationJobs.id, jobId));
    }
}
