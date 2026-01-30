import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { labs } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const module = searchParams.get('module');

        let conditions = eq(labs.status, 'published');

        if (module) {
            conditions = and(conditions, eq(labs.module, module as any))!;
        }

        const publishedLabs = await db
            .select({
                id: labs.id,
                title: labs.title,
                description: labs.description,
                difficulty: labs.difficulty,
                module: labs.module,
                topic: labs.topic,
                estimatedMinutes: labs.estimatedMinutes,
            })
            .from(labs)
            .where(conditions)
            .orderBy(desc(labs.createdAt));

        return NextResponse.json({ success: true, data: publishedLabs });
    } catch (error) {
        console.error('Error fetching labs:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch labs' }, { status: 500 });
    }
}
