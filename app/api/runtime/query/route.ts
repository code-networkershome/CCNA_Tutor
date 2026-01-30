import { NextRequest, NextResponse } from 'next/server';
import { answerQuery } from '@/lib/tutor/engine';
import { getCurrentUser } from '@/lib/auth/session';
import { trackActivity, updateUserProgress } from '@/lib/progress/tracker';
import { rateLimit, getRateLimitHeaders } from '@/lib/auth/rate-limit';
import { querySchema } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Rate limiting
        const rateLimitResult = await rateLimit(`user:${user.id}`, '/api/runtime/query');

        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: 'Rate limit exceeded' },
                { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
            );
        }

        const body = await request.json();
        const parsed = querySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid query' },
                { status: 400 }
            );
        }

        const { query, module, mode, style, difficulty } = parsed.data;

        // Get tutor response with style and difficulty options
        const response = await answerQuery(query, module, mode, { style, difficulty });

        // Track activity
        await trackActivity(
            user.id,
            'query',
            'tutor',
            undefined,
            { query, module, mode, style, difficulty, source: response.source },
            response.latency
        );

        // Update progress (minimal XP for queries)
        await updateUserProgress(user.id, module, Math.ceil(response.latency / 1000), 5);

        return NextResponse.json({
            success: true,
            data: response,
        });
    } catch (error) {
        console.error('Query error:', error);
        return NextResponse.json(
            { success: false, error: 'Query failed' },
            { status: 500 }
        );
    }
}
