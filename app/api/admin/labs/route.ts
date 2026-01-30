import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { labs } from '@/lib/db/schema';
import { eq, desc, isNull } from 'drizzle-orm';
import { z } from 'zod';

// GET - List all labs for admin
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const allLabs = await db
            .select()
            .from(labs)
            .orderBy(desc(labs.createdAt))
            .limit(100);

        return NextResponse.json({ success: true, data: allLabs });
    } catch (error) {
        console.error('Error fetching labs:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch labs' }, { status: 500 });
    }
}

// Lab creation schema - matches the schema.ts labs table
const createLabSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    topic: z.string().min(1),
    difficulty: z.enum(['guided', 'standard', 'challenge']), // Matches labDifficultyEnum
    estimatedMinutes: z.number().min(5).max(180).default(30),
    objectives: z.array(z.string()).optional(),
    topology: z.object({}).passthrough().optional(),
    initialConfigs: z.object({}).passthrough().optional(),
    solutionConfigs: z.object({}).passthrough().optional(),
    hints: z.array(z.string()).optional(),
});

// POST - Create new lab
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const validated = createLabSchema.parse(body);

        const [newLab] = await db.insert(labs).values({
            module: 'ccna',
            title: validated.title,
            description: validated.description,
            topic: validated.topic,
            difficulty: validated.difficulty,
            estimatedMinutes: validated.estimatedMinutes,
            objectives: validated.objectives || [],
            topology: validated.topology || {},
            initialConfigs: validated.initialConfigs || {},
            solutionConfigs: validated.solutionConfigs || {},
            hints: validated.hints || [],
            status: 'draft',
        }).returning();

        return NextResponse.json({ success: true, data: newLab });
    } catch (error) {
        console.error('Error creating lab:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Failed to create lab' }, { status: 500 });
    }
}

// PUT - Update lab status
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
            .update(labs)
            .set({ status, updatedAt: new Date() })
            .where(eq(labs.id, id))
            .returning();

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error updating lab:', error);
        return NextResponse.json({ success: false, error: 'Failed to update lab' }, { status: 500 });
    }
}

// DELETE - Hard delete lab (no deletedAt field in labs schema)
export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !isAdmin(user.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Lab ID required' }, { status: 400 });
        }

        // Hard delete since labs table doesn't have deletedAt column
        await db.delete(labs).where(eq(labs.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting lab:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete lab' }, { status: 500 });
    }
}
