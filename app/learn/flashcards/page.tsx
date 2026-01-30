'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Flashcard {
    id: string;
    front: string;
    back: string;
    topic: string;
    difficulty: string;
    source?: string;
}

const TOPICS = [
    'Network Fundamentals',
    'OSI Model',
    'TCP/IP',
    'VLANs',
    'Subnetting',
    'OSPF',
    'ACLs',
    'NAT',
    'Security',
    'Automation',
];

export default function FlashcardsPage() {
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
    const [showTopicSelector, setShowTopicSelector] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const router = useRouter();

    const fetchCards = async () => {
        setLoading(true);
        setSessionComplete(false);
        setSessionStats({ reviewed: 0, correct: 0 });
        try {
            const response = await fetch('/api/flashcards');
            const data = await response.json();
            if (data.success) {
                setCards(data.data);
                setCurrentIndex(0);
                setFlipped(false);
            }
        } catch (error) {
            console.error('Failed to fetch cards:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCards();
    }, []);

    const handleGenerateCards = async (topic: string) => {
        setGenerating(true);
        setShowTopicSelector(false);
        setSessionComplete(false);

        try {
            const response = await fetch('/api/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    topic,
                }),
            });

            const data = await response.json();
            if (data.success && data.data) {
                setCards(data.data);
                setCurrentIndex(0);
                setFlipped(false);
                setSessionStats({ reviewed: 0, correct: 0 });
            }
        } catch (error) {
            console.error('Failed to generate cards:', error);
        } finally {
            setGenerating(false);
        }
    };

    const handleRating = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
        const currentCard = cards[currentIndex];
        const isCorrect = rating === 'good' || rating === 'easy';

        const newStats = {
            reviewed: sessionStats.reviewed + 1,
            correct: sessionStats.correct + (isCorrect ? 1 : 0),
        };
        setSessionStats(newStats);
        setFlipped(false);

        // Send review to API
        try {
            await fetch('/api/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flashcardId: currentCard.id,
                    rating
                })
            });
        } catch (error) {
            console.error('Failed to save review:', error);
        }

        setTimeout(() => {
            if (currentIndex < cards.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setSessionComplete(true);
            }
        }, 200);
    };

    const handleRestartSession = () => {
        setCurrentIndex(0);
        setFlipped(false);
        setSessionStats({ reviewed: 0, correct: 0 });
        setSessionComplete(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin h-8 w-8 border-4 border-cisco-blue border-t-transparent rounded-full" />
            </div>
        );
    }

    // Session Complete Screen
    if (sessionComplete) {
        const accuracy = sessionStats.reviewed > 0
            ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
            : 0;

        return (
            <div className="max-w-2xl mx-auto text-center py-12">
                <div className="card p-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Great job! You've reviewed all {cards.length} cards.
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className="text-2xl font-bold text-cisco-blue">{sessionStats.reviewed}</div>
                            <div className="text-sm text-gray-500">Cards Reviewed</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className="text-2xl font-bold text-green-600">{sessionStats.correct}</div>
                            <div className="text-sm text-gray-500">Correct</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
                            <div className="text-sm text-gray-500">Accuracy</div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button onClick={handleRestartSession} className="btn-outline">
                            🔄 Review Again
                        </button>
                        <button onClick={() => setShowTopicSelector(true)} className="btn-primary">
                            ✨ Generate New Cards
                        </button>
                        <button onClick={() => router.push('/learn')} className="btn-outline">
                            ← Back to Dashboard
                        </button>
                    </div>

                    {showTopicSelector && (
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
                            <h3 className="font-semibold mb-3">Select a topic:</h3>
                            <div className="flex flex-wrap gap-2">
                                {TOPICS.map(topic => (
                                    <button
                                        key={topic}
                                        onClick={() => handleGenerateCards(topic)}
                                        disabled={generating}
                                        className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-700 hover:bg-cisco-blue hover:text-white transition-colors"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Flashcards</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {cards.length} cards available
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm">
                        <span className="text-green-600">✓ {sessionStats.correct}</span>
                        <span className="text-gray-500 ml-2">{sessionStats.reviewed} reviewed</span>
                    </div>
                    <button
                        onClick={() => setShowTopicSelector(!showTopicSelector)}
                        className="btn-primary"
                        disabled={generating}
                    >
                        {generating ? (
                            <span className="flex items-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                Generating...
                            </span>
                        ) : (
                            '+ Generate Cards'
                        )}
                    </button>
                </div>
            </div>

            {/* Topic Selector */}
            {showTopicSelector && (
                <div className="card p-4 animate-fade-in">
                    <h3 className="font-semibold mb-3">Select a topic to generate flashcards:</h3>
                    <div className="flex flex-wrap gap-2">
                        {TOPICS.map(topic => (
                            <button
                                key={topic}
                                onClick={() => handleGenerateCards(topic)}
                                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 hover:bg-cisco-blue hover:text-white transition-colors"
                            >
                                {topic}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 pt-3 border-t dark:border-gray-700">
                        <input
                            type="text"
                            placeholder="Or type a custom topic..."
                            className="input w-full"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value) {
                                    handleGenerateCards(e.currentTarget.value);
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            {/* No Cards State */}
            {cards.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="text-5xl mb-4">🎴</div>
                    <h2 className="text-xl font-semibold mb-2">No flashcards yet</h2>
                    <p className="text-gray-500 mb-4">Generate AI-powered flashcards to start studying</p>
                    <button onClick={() => setShowTopicSelector(true)} className="btn-primary">
                        Generate Flashcards
                    </button>
                </div>
            ) : (
                <>
                    {/* Progress */}
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
                        />
                    </div>

                    {/* Flashcard - Click to flip */}
                    <div
                        className="relative w-full aspect-video cursor-pointer select-none"
                        onClick={() => setFlipped(!flipped)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setFlipped(!flipped);
                            }
                        }}
                    >
                        {/* Front of card */}
                        <div
                            className={`absolute inset-0 w-full h-full rounded-xl shadow-lg p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ease-in-out ${flipped
                                    ? 'opacity-0 scale-95 pointer-events-none'
                                    : 'opacity-100 scale-100'
                                }`}
                            style={{
                                backgroundColor: '#e0f7fa',
                                border: '2px solid #b2ebf2',
                                zIndex: flipped ? 0 : 10
                            }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-2 py-1 bg-gray-200 text-gray-700 text-sm rounded-full">
                                    {cards[currentIndex]?.topic}
                                </span>
                                {cards[currentIndex]?.source === 'llm' && (
                                    <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">AI Generated</span>
                                )}
                            </div>
                            <p className="text-xl font-medium text-gray-800">{cards[currentIndex]?.front}</p>
                            <p className="text-sm text-gray-500 mt-6 animate-pulse">👆 Click to reveal answer</p>
                        </div>

                        {/* Back of card */}
                        <div
                            className={`absolute inset-0 w-full h-full rounded-xl shadow-lg p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ease-in-out ${flipped
                                    ? 'opacity-100 scale-100'
                                    : 'opacity-0 scale-95 pointer-events-none'
                                }`}
                            style={{
                                backgroundColor: '#e8f5e9',
                                border: '2px solid #a5d6a7',
                                zIndex: flipped ? 10 : 0
                            }}
                        >
                            <div className="text-sm text-green-600 font-medium mb-2">✓ Answer</div>
                            <p className="text-lg text-gray-800">{cards[currentIndex]?.back}</p>
                            <p className="text-sm text-gray-500 mt-6">Rate your recall below 👇</p>
                        </div>
                    </div>

                    {/* Rating Buttons */}
                    {flipped && (
                        <div className="flex justify-center gap-3 animate-fade-in">
                            <button onClick={(e) => { e.stopPropagation(); handleRating('again'); }} className="btn-outline border-red-300 text-red-600 hover:bg-red-50 px-6">
                                Again
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleRating('hard'); }} className="btn-outline border-orange-300 text-orange-600 hover:bg-orange-50 px-6">
                                Hard
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleRating('good'); }} className="btn-outline border-green-300 text-green-600 hover:bg-green-50 px-6">
                                Good
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleRating('easy'); }} className="btn-outline border-cyan-500 text-cyan-600 hover:bg-cyan-50 px-6">
                                Easy
                            </button>
                        </div>
                    )}

                    {/* Card Counter */}
                    <div className="text-center text-sm text-gray-500">
                        Card {currentIndex + 1} of {cards.length}
                    </div>
                </>
            )}
        </div>
    );
}
