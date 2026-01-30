import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const NEON_AUTH_URL = process.env.NEON_AUTH_BASE_URL || 'https://ep-wandering-hill-ah66iehg.neonauth.c-3.us-east-1.aws.neon.tech/neondb/auth';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password required' },
                { status: 400 }
            );
        }

        console.log(`[signin] Attempting sign-in for: ${email}`);
        console.log(`[signin] Calling Neon Auth at: ${NEON_AUTH_URL}/sign-in/email`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': APP_URL,
                },
                body: JSON.stringify({
                    email,
                    password,
                    callbackURL: `${APP_URL}/learn`,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            console.log(`[signin] Neon Auth response status: ${response.status}`);

            const data = await response.json().catch(() => ({}));
            console.log(`[signin] Neon Auth response data:`, JSON.stringify(data).slice(0, 200));

            if (!response.ok) {
                return NextResponse.json(
                    { success: false, error: data.message || data.error || 'Invalid email or password' },
                    { status: response.status }
                );
            }

            // SYNC USER TO LOCAL DATABASE (upsert on login)
            let userRole = 'student';

            try {
                const userEmail = (data.user?.email || email).toLowerCase();
                const userName = data.user?.name || email.split('@')[0];

                // Check if user exists in local DB
                const [existingUser] = await db
                    .select()
                    .from(users)
                    .where(eq(users.email, userEmail))
                    .limit(1);

                if (existingUser) {
                    // User exists, use their defined role
                    userRole = existingUser.role;
                } else {
                    // Create user in local DB
                    const userId = data.user?.id || `user_${Date.now()}`;
                    await db.insert(users).values({
                        id: userId,
                        email: userEmail,
                        name: userName,
                        role: 'student', // Default role
                    });
                    console.log(`[signin] Created new user in local DB: ${userEmail}`);
                }
            } catch (dbError) {
                console.error('[signin] Failed to sync user to local DB:', dbError);
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

            // Store role in the user cookie so session.ts can read it
            cookieStore.set('neon_auth_user', JSON.stringify({
                email: data.user?.email || email,
                id: data.user?.id || 'user-id',
                name: data.user?.name || email.split('@')[0],
                role: userRole,
            }), {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });

            // Redirect based on DB role
            const isAdmin = ['super_admin', 'admin', 'content_admin'].includes(userRole);
            const redirectUrl = isAdmin ? '/dashboard' : '/learn';

            console.log(`[signin] Success! Role: ${userRole}. Redirecting to ${redirectUrl}`);
            return NextResponse.json({
                success: true,
                user: { ...(data.user || { email }), role: userRole },
                redirectUrl,
            });

        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.error('[signin] Request timed out after 10s');
                return NextResponse.json(
                    { success: false, error: 'Authentication service timed out. Please try again.' },
                    { status: 504 }
                );
            }
            throw fetchError;
        }

    } catch (error) {
        console.error('[signin] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Sign in failed' },
            { status: 500 }
        );
    }
}
