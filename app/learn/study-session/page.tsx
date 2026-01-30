'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface StudyStats {
    questionsAsked: number;
    cardsReviewed: number;
    quizzesCompleted: number;
    correctAnswers: number;
    timeSpentSeconds: number;
    topicsCovered: string[];
}

type SessionPhase = 'setup' | 'focus' | 'break' | 'summary';

export default function StudySessionPage() {
    const [phase, setPhase] = useState<SessionPhase>('setup');
    const [focusDuration, setFocusDuration] = useState(25); // minutes
    const [breakDuration, setBreakDuration] = useState(5); // minutes
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [cycles, setCycles] = useState(0);
    const [targetCycles, setTargetCycles] = useState(4);
    const [stats, setStats] = useState<StudyStats>({
        questionsAsked: 0,
        cardsReviewed: 0,
        quizzesCompleted: 0,
        correctAnswers: 0,
        timeSpentSeconds: 0,
        topicsCovered: [],
    });

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((t) => t - 1);
                setStats((s) => ({ ...s, timeSpentSeconds: s.timeSpentSeconds + 1 }));
            }, 1000);
        } else if (isRunning && timeLeft === 0) {
            // Timer completed
            handlePhaseComplete();
        }

        return () => clearInterval(interval);
    }, [isRunning, timeLeft]);

    // Audio notification
    const playNotification = () => {
        if (typeof window !== 'undefined') {
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQoKrtnKl1wAAp7W2YZFFhSy0NeFOQ4Xu8nKjEwMG7vJzI9ODRu8yc2QTgwbvMnNkE4MG7vJzZBODBu7yc2QTgwbvMnNkE4MG7zJzZBODBu8yc2QTgwbu8nNkE4MG7vJzZBODBu7yc2QTgwbvMnNkE4MG7zJzZBODBu8yc2QTgwcvMnNkE4MHLzJzZBODBy8yc2QTgwcvMnNkU4MHLzJzZFODBy8yc2RTgwcvMnNkU4MHLzJzZFODBy8yc2RTgwdvMnNkU4MHbzJzZFODB28yc2RTgwdvMnNkU4MHbzJzZFODB28yc2RTgwdvMnOkU4MHbzJzpFODB28yc6RTgwdvMnOkU4MHbzJzpFODB28yc6STgwevMnOkk4MHrzJzpJODB68yc6STgwevMnOkk4MHrzJzpJODB68yc+STgwevMnPkk4MHrzJz5JODB68yc+STgwevMnPkk4MHrzJz5JODB68yc+STgwfvMnPkk4MH7zJz5JODB+8ydCSTgwfvMnQkk4MH7zJ0JJODB+8ydCSTgwfvMnQkk4MH7zJ0JNODB+8ydCTTgwfvMnRk04MH7zJ0ZNODB+8ydGTTgwgvMnRk04MILzJ0ZNODCC8ydGTTgwgvMnRk04MILzJ0ZRODCC8ydGUTgwgvMnRlE4MILzJ0ZRODCC8ydGUTgwgvMnSlE4MILzJ0pRODCC8ydKUTgwhvMnSlE4MIbzJ0pRODCG8ydKUTgwhvMnSlE4MIbzJ0pRODCG8ydOUTgwhvMnTlE4MIbzJ05VODCG8ydOVTgwhvMnTlU4MIrzJ05VODCK8ydOVTgwivMnTlU4MIrzJ05VODCK8ydSVTgwivMnUlU4MIrzJ1JVODCK8ydSVTgwivMnUlU4MIrzJ1JZODCK8ydSWTgwivMnUlk4MIrzJ1JZODCM8ydSWTgwjPMnUlk4MIzzJ1JZODCM8ydSWTgwjPMnVVk4MIzzJ1VZODCM8ydVWTgwjPMnVVk4MIzzJ1VdODCM8ydVXTgwjPMnVV04MIzzJ1VdODCM8ydVXTgwjfMnVV04MI3zJ1VdODCN8ydZXTgwjfMnWV04MI3zJ1ldODCN8ydZXTgwjfMnWV04MI3zJ1ldODCN8ydZYTgwjfMnWWE4MI3zJ1lhODCO8ydZYTgwjvMnWWE4MI7zJ1lhODCO8ydZYTgwjvMnXWE4MI7zJ11hODCO8yddYTgwjvMnXWE4MI7zJ11hODCO8yddZTgwjvMnXWU4MI7zJ11lODCO8yddZTgwjvMnYWU4MI/zJ2FlODCP8ydhZTgwj/MnYWU4MI/zJ2FlODCP8ydhZTgwj/MnYWk4MI/zJ2FpODCP8ydhaTgwj/MnYWk4MI/zJ2FpODCQ8ydhaTgwkPMnZWk4MJDzJ2VpODCQ8ydlaTgwkPMnZWk4MJDzJ2VpODCQ8ydlbTgwkPMnZW04MJDzJ2VtODCQ8ydlbTgwkPMnZW04MJDzJ2VtODCR8ydlbTgwkfMnaW04MJHzJ2ltODCR8ydpbTgwkfMnaW04MJHzJ2ltODCR8ydpcTgwkfMnaXE4MJHzJ2lxODCR8ydpcTgwkfMnaXE4MJHzJ2lxODCS8ydpcTgwkvMnbXE4MJLzJ21xODCS8ydtcTgwkvMnbXE4MJLzJ21xODCS8ydtdTgwkvMnbXU4MJLzJ211ODCS8ydtdTgwkvMnbXU4');
                audio.volume = 0.5;
                audio.play().catch(() => { });
            } catch (e) {
                // Ignore audio errors
            }
        }
    };

    const handlePhaseComplete = () => {
        playNotification();
        setIsRunning(false);

        if (phase === 'focus') {
            setCycles((c) => c + 1);
            if (cycles + 1 >= targetCycles) {
                setPhase('summary');
            } else {
                setPhase('break');
                setTimeLeft(breakDuration * 60);
            }
        } else if (phase === 'break') {
            setPhase('focus');
            setTimeLeft(focusDuration * 60);
        }
    };

    const startSession = () => {
        setPhase('focus');
        setTimeLeft(focusDuration * 60);
        setIsRunning(true);
        setCycles(0);
        setStats({
            questionsAsked: 0,
            cardsReviewed: 0,
            quizzesCompleted: 0,
            correctAnswers: 0,
            timeSpentSeconds: 0,
            topicsCovered: [],
        });
    };

    const toggleTimer = () => {
        setIsRunning(!isRunning);
    };

    const skipPhase = () => {
        setTimeLeft(0);
    };

    const resetSession = () => {
        setPhase('setup');
        setIsRunning(false);
        setTimeLeft(0);
        setCycles(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTotalTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins} minutes`;
    };

    // Calculate progress
    const totalSessionTime = (focusDuration + breakDuration) * targetCycles * 60;
    const progressPercent = Math.min(100, (stats.timeSpentSeconds / totalSessionTime) * 100);

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">📖 Study Session</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Pomodoro technique for focused learning
                    </p>
                </div>
                <Link href="/learn" className="btn-outline">
                    ← Back
                </Link>
            </div>

            {phase === 'setup' && (
                <div className="card p-8 text-center">
                    <div className="text-6xl mb-6">🍅</div>
                    <h2 className="text-xl font-bold mb-6">Configure Your Session</h2>

                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div>
                            <label className="block text-sm text-gray-500 mb-2">Focus Time</label>
                            <select
                                value={focusDuration}
                                onChange={(e) => setFocusDuration(Number(e.target.value))}
                                className="input w-full"
                            >
                                <option value={15}>15 min</option>
                                <option value={25}>25 min</option>
                                <option value={30}>30 min</option>
                                <option value={45}>45 min</option>
                                <option value={60}>60 min</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-2">Break Time</label>
                            <select
                                value={breakDuration}
                                onChange={(e) => setBreakDuration(Number(e.target.value))}
                                className="input w-full"
                            >
                                <option value={5}>5 min</option>
                                <option value={10}>10 min</option>
                                <option value={15}>15 min</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-2">Cycles</label>
                            <select
                                value={targetCycles}
                                onChange={(e) => setTargetCycles(Number(e.target.value))}
                                className="input w-full"
                            >
                                <option value={2}>2 cycles</option>
                                <option value={3}>3 cycles</option>
                                <option value={4}>4 cycles</option>
                                <option value={6}>6 cycles</option>
                            </select>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-6">
                        Total session time: ~{Math.round((focusDuration + breakDuration) * targetCycles / 60 * 10) / 10} hours
                    </p>

                    <button onClick={startSession} className="btn-primary px-8 py-3 text-lg">
                        🚀 Start Session
                    </button>
                </div>
            )}

            {(phase === 'focus' || phase === 'break') && (
                <div className="card p-8 text-center">
                    {/* Phase Indicator */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${phase === 'focus'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-600'
                        }`}>
                        <span className="text-2xl">{phase === 'focus' ? '🍅' : '☕'}</span>
                        <span className="font-bold uppercase">{phase} Time</span>
                    </div>

                    {/* Timer Display */}
                    <div className={`text-8xl font-mono font-bold mb-6 ${phase === 'focus' ? 'text-red-500' : 'text-green-500'
                        }`}>
                        {formatTime(timeLeft)}
                    </div>

                    {/* Progress */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {Array.from({ length: targetCycles }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < cycles
                                        ? 'bg-green-500 text-white'
                                        : i === cycles
                                            ? phase === 'focus'
                                                ? 'bg-red-500 text-white animate-pulse'
                                                : 'bg-yellow-500 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            >
                                {i + 1}
                            </div>
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={toggleTimer}
                            className={`px-6 py-3 rounded-lg font-bold ${isRunning
                                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                        >
                            {isRunning ? '⏸️ Pause' : '▶️ Resume'}
                        </button>
                        <button
                            onClick={skipPhase}
                            className="btn-outline"
                        >
                            ⏭️ Skip
                        </button>
                        <button
                            onClick={resetSession}
                            className="btn-outline text-red-500 border-red-500 hover:bg-red-50"
                        >
                            ✖️ End
                        </button>
                    </div>

                    {/* Quick Actions during Focus */}
                    {phase === 'focus' && (
                        <div className="mt-8 pt-8 border-t dark:border-gray-700">
                            <p className="text-sm text-gray-500 mb-4">Quick study links:</p>
                            <div className="flex justify-center gap-3 flex-wrap">
                                <Link href="/learn/tutor" className="btn-outline text-sm" target="_blank">
                                    🤖 AI Tutor
                                </Link>
                                <Link href="/learn/flashcards" className="btn-outline text-sm" target="_blank">
                                    🃏 Flashcards
                                </Link>
                                <Link href="/learn/quiz" className="btn-outline text-sm" target="_blank">
                                    📝 Practice Quiz
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Break suggestions */}
                    {phase === 'break' && (
                        <div className="mt-8 pt-8 border-t dark:border-gray-700">
                            <p className="text-sm text-gray-500 mb-2">Break suggestions:</p>
                            <p className="text-gray-600 dark:text-gray-400">
                                🚶 Take a short walk • 💧 Get some water • 👀 Rest your eyes
                            </p>
                        </div>
                    )}
                </div>
            )}

            {phase === 'summary' && (
                <div className="card p-8 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Great work! You completed {cycles} Pomodoro cycle(s).
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-3xl font-bold text-blue-600">{formatTotalTime(stats.timeSpentSeconds)}</div>
                            <div className="text-sm text-gray-500">Total Study Time</div>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-3xl font-bold text-green-600">{cycles}</div>
                            <div className="text-sm text-gray-500">Pomodoros Completed</div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button onClick={startSession} className="btn-primary">
                            🔄 Start New Session
                        </button>
                        <Link href="/learn" className="btn-outline">
                            Return to Dashboard
                        </Link>
                    </div>
                </div>
            )}

            {/* Stats Bar (during active session) */}
            {(phase === 'focus' || phase === 'break') && (
                <div className="card p-4">
                    <h3 className="font-medium mb-3 text-sm text-gray-500">Session Progress</h3>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                        <div
                            className="h-full bg-cisco-blue rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>Time studied: {formatTotalTime(stats.timeSpentSeconds)}</span>
                        <span>Cycle {cycles + 1} of {targetCycles}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
