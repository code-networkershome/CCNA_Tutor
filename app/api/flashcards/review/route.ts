import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { flashcards as flashcardsTable } from '@/lib/db/schema';
import { eq, and, lte, sql } from 'drizzle-orm';

// SM-2 Algorithm parameters
const INITIAL_EASINESS = 2.5;
const MINIMUM_EASINESS = 1.3;
const INITIAL_INTERVAL = 1; // 1 day

interface ReviewData {
    cardId: string;
    quality: number; // 0-5 rating: 0=complete blackout, 5=perfect recall
}

interface CardReviewState {
    cardId: string;
    easiness: number;
    interval: number;
    repetitions: number;
    nextReview: Date;
}

// In-memory storage for review states (use database in production)
const reviewStates: Record<string, Record<string, CardReviewState>> = {};

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const topic = url.searchParams.get('topic');

        // Get all flashcards that are published
        const flashcards = await db
            .select()
            .from(flashcardsTable)
            .where(eq(flashcardsTable.status, 'published'))
            .limit(50);

        // Filter by topic if specified
        let filteredCards = flashcards;
        if (topic) {
            filteredCards = flashcards.filter(card =>
                card.topic?.toLowerCase().includes(topic.toLowerCase())
            );
        }

        // Get user's review states
        const userStates = reviewStates[user.id] || {};
        const now = new Date();

        // Calculate which cards are due for review
        const dueCards = filteredCards.map(card => {
            const state = userStates[card.id];
            const isDue = !state || new Date(state.nextReview) <= now;
            const isNew = !state;

            return {
                ...card,
                isDue,
                isNew,
                easiness: state?.easiness || INITIAL_EASINESS,
                interval: state?.interval || INITIAL_INTERVAL,
                repetitions: state?.repetitions || 0,
                nextReview: state?.nextReview || now,
            };
        });

        // Sort: due cards first, then by interval (shortest first)
        dueCards.sort((a, b) => {
            if (a.isDue && !b.isDue) return -1;
            if (!a.isDue && b.isDue) return 1;
            return a.interval - b.interval;
        });

        // Limit results
        const cardsToReview = dueCards.slice(0, limit);

        // Stats
        const totalDue = dueCards.filter(c => c.isDue).length;
        const totalNew = dueCards.filter(c => c.isNew).length;
        const totalReviewed = dueCards.filter(c => !c.isNew).length;

        return NextResponse.json({
            success: true,
            data: {
                cards: cardsToReview,
                stats: {
                    totalCards: filteredCards.length,
                    dueToday: totalDue,
                    newCards: totalNew,
                    reviewed: totalReviewed,
                },
            },
        });
    } catch (error) {
        console.error('Flashcard review GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch review cards' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { cardId, quality } = body as ReviewData;

        if (!cardId || quality === undefined || quality < 0 || quality > 5) {
            return NextResponse.json({
                success: false,
                error: 'Invalid request. cardId and quality (0-5) required.'
            }, { status: 400 });
        }

        // Initialize user states if needed
        if (!reviewStates[user.id]) {
            reviewStates[user.id] = {};
        }

        // Get current state or create new
        const currentState = reviewStates[user.id][cardId] || {
            cardId,
            easiness: INITIAL_EASINESS,
            interval: INITIAL_INTERVAL,
            repetitions: 0,
            nextReview: new Date(),
        };

        // Apply SM-2 algorithm
        const newState = calculateNextReview(currentState, quality);
        reviewStates[user.id][cardId] = newState;

        return NextResponse.json({
            success: true,
            data: {
                cardId,
                newState: {
                    easiness: newState.easiness.toFixed(2),
                    interval: newState.interval,
                    repetitions: newState.repetitions,
                    nextReview: newState.nextReview.toISOString(),
                    nextReviewFormatted: formatInterval(newState.interval),
                },
                message: quality >= 3
                    ? `Great! Review again in ${formatInterval(newState.interval)}`
                    : 'Card will be shown again soon for more practice',
            },
        });
    } catch (error) {
        console.error('Flashcard review POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update review' }, { status: 500 });
    }
}

function calculateNextReview(state: CardReviewState, quality: number): CardReviewState {
    // SM-2 Algorithm implementation
    let { easiness, interval, repetitions } = state;

    // Update easiness factor
    easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easiness < MINIMUM_EASINESS) {
        easiness = MINIMUM_EASINESS;
    }

    // If quality < 3, reset repetitions (card not remembered)
    if (quality < 3) {
        repetitions = 0;
        interval = 1;
    } else {
        // Card remembered
        repetitions += 1;

        if (repetitions === 1) {
            interval = 1;
        } else if (repetitions === 2) {
            interval = 6;
        } else {
            interval = Math.round(interval * easiness);
        }
    }

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
        cardId: state.cardId,
        easiness,
        interval,
        repetitions,
        nextReview,
    };
}

function formatInterval(days: number): string {
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.round(days / 7)} week(s)`;
    if (days < 365) return `${Math.round(days / 30)} month(s)`;
    return `${Math.round(days / 365)} year(s)`;
}
