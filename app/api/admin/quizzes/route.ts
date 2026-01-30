import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { quizzes, questions, quizQuestions } from '@/lib/db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

// GET - List all quizzes for admin
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const module = searchParams.get('module') || 'ccna';

        const allQuizzes = await db
            .select({
                id: quizzes.id,
                title: quizzes.title,
                description: quizzes.description,
                topics: quizzes.topics,
                questionCount: quizzes.questionCount,
                timeLimit: quizzes.timeLimit,
                passingScore: quizzes.passingScore,
                status: quizzes.status,
                createdAt: quizzes.createdAt,
            })
            .from(quizzes)
            .where(and(
                eq(quizzes.module, module as any),
                isNull(quizzes.deletedAt)
            ))
            .orderBy(desc(quizzes.createdAt))
            .limit(100);

        return NextResponse.json({ success: true, data: allQuizzes });
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch quizzes' }, { status: 500 });
    }
}

// Quiz creation schema - aligned with schema.ts
const createQuizSchema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    topics: z.array(z.string()).min(1),
    timeLimit: z.number().min(1).max(180).optional(),
    passingScore: z.number().min(1).max(100).default(70),
    shuffleQuestions: z.boolean().default(true),
    shuffleOptions: z.boolean().default(true),
    questions: z.array(z.object({
        questionText: z.string().min(5),
        type: z.enum(['multiple_choice', 'multiple_select', 'drag_drop', 'fill_blank', 'hotspot', 'simulation']).default('multiple_choice'),
        difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
        options: z.array(z.any()).min(2),
        correctAnswer: z.any(),
        explanation: z.string().optional(),
        points: z.number().default(1),
    })).min(1),
});

// POST - Create new quiz with questions
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const validated = createQuizSchema.parse(body);

        // Create quiz (without difficulty - quizzes table doesn't have this field)
        const [newQuiz] = await db.insert(quizzes).values({
            module: 'ccna',
            title: validated.title,
            description: validated.description || '',
            topics: validated.topics,
            questionCount: validated.questions.length,
            timeLimit: validated.timeLimit || validated.questions.length * 2,
            passingScore: validated.passingScore,
            shuffleQuestions: validated.shuffleQuestions,
            shuffleOptions: validated.shuffleOptions,
            status: 'draft',
            createdBy: user.id,
        }).returning();

        // Create questions and link them to quiz
        for (let i = 0; i < validated.questions.length; i++) {
            const q = validated.questions[i];

            // First create the question in the questions table
            const [newQuestion] = await db.insert(questions).values({
                module: 'ccna',
                topic: validated.topics[0] || 'General',
                type: q.type,
                difficulty: q.difficulty,
                questionText: q.questionText,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation || '',
                points: q.points,
                status: 'published',
                generatedBy: 'human',
            }).returning();

            // Then link it to the quiz via quizQuestions junction table
            await db.insert(quizQuestions).values({
                quizId: newQuiz.id,
                questionId: newQuestion.id,
                order: i,
            });
        }

        return NextResponse.json({ success: true, data: newQuiz });
    } catch (error) {
        console.error('Error creating quiz:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Failed to create quiz' }, { status: 500 });
    }
}

// PUT - Update quiz status
export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ success: false, error: 'ID and status required' }, { status: 400 });
        }

        const [updated] = await db
            .update(quizzes)
            .set({ status, updatedAt: new Date() })
            .where(eq(quizzes.id, id))
            .returning();

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error updating quiz:', error);
        return NextResponse.json({ success: false, error: 'Failed to update quiz' }, { status: 500 });
    }
}

// DELETE - Soft delete quiz
export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Quiz ID required' }, { status: 400 });
        }

        await db
            .update(quizzes)
            .set({ deletedAt: new Date() })
            .where(eq(quizzes.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete quiz' }, { status: 500 });
    }
}
