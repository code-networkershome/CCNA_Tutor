import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const NEON_AUTH_URL = process.env.NEON_AUTH_BASE_URL || 'https://ep-wandering-hill-ah66iehg.neonauth.c-3.us-east-1.aws.neon.tech/neondb/auth';

export async function POST(request: NextRequest) {
    try {
        // Automatically detect the base URL using Vercel's auto-provided env vars
        const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
        const vercelUrl = process.env.VERCEL_URL;
        const manualUrl = process.env.NEXT_PUBLIC_APP_URL;

        let APP_URL: string;
        if (manualUrl) {
            // Manual override takes highest priority
            APP_URL = manualUrl;
        } else if (vercelProductionUrl) {
            // Vercel production deployment (auto-set by Vercel)
            APP_URL = `https://${vercelProductionUrl}`;
        } else if (vercelUrl) {
            // Vercel preview deployment
            APP_URL = `https://${vercelUrl}`;
        } else {
            // Local development - use headers
            const protocol = request.headers.get('x-forwarded-proto') || 'http';
            const host = request.headers.get('host') || 'localhost:3000';
            APP_URL = `${protocol}://${host}`;
        }

        console.log(`[signup] Detected APP_URL: ${APP_URL}`);

        const body = await request.json();
        const { email, password, name } = body;

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password required' },
                { status: 400 }
            );
        }

        console.log(`[signup] Attempting sign-up for: ${email}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`${NEON_AUTH_URL}/sign-up/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': APP_URL,
                },
                body: JSON.stringify({
                    email,
                    password,
                    name: name || email.split('@')[0],
                    // Note: Removed callbackURL - we handle redirects ourselves after auth
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            console.log(`[signup] Neon Auth response status: ${response.status}`);

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                return NextResponse.json(
                    { success: false, error: data.message || data.error || 'Sign up failed' },
                    { status: response.status }
                );
            }

            // SYNC USER TO LOCAL DATABASE
            try {
                const userId = data.user?.id || `user_${Date.now()}`;
                const userEmail = (data.user?.email || email).toLowerCase();
                const userName = data.user?.name || name || email.split('@')[0];

                // Check if user exists
                const [existingUser] = await db
                    .select()
                    .from(users)
                    .where(eq(users.email, userEmail))
                    .limit(1);

                if (!existingUser) {
                    // Create user in local DB
                    await db.insert(users).values({
                        id: userId,
                        email: userEmail,
                        name: userName,
                        role: 'student',
                    });
                    console.log(`[signup] Created user in local DB: ${userEmail}`);
                }
            } catch (dbError) {
                console.error('[signup] Failed to sync user to local DB:', dbError);
                // Continue - don't fail signup if DB sync fails
            }

            // Set session cookies
            const cookieStore = await cookies();
            const sessionToken = data.token || data.session?.token || `neon_${Date.now()}_${Math.random().toString(36)}`;

            cookieStore.set('neon_auth_session', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });

            cookieStore.set('neon_auth_user', JSON.stringify({
                email: data.user?.email || email,
                id: data.user?.id || 'user-id',
                name: data.user?.name || name || email.split('@')[0],
            }), {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });

            return NextResponse.json({
                success: true,
                user: data.user || { email, name },
                redirectUrl: '/learn',
            });

        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                return NextResponse.json(
                    { success: false, error: 'Authentication service timed out. Please try again.' },
                    { status: 504 }
                );
            }
            throw fetchError;
        }

    } catch (error) {
        console.error('[signup] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Sign up failed' },
            { status: 500 }
        );
    }
}
