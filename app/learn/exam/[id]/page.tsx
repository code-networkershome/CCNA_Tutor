'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Question {
    id: string;
    type: string;
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    topic?: string;
    points: number;
}

export default function ExamPage() {
    const params = useParams();
    const router = useRouter();
    const [started, setStarted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [attemptId, setAttemptId] = useState('');
    const [generatingStatus, setGeneratingStatus] = useState('');

    // Exam configuration based on ID - MUST match the exam list page
    const examConfigs: Record<string, {
        title: string;
        questions: number;
        timeLimit: number;
        topics: string[];
    }> = {
        'ccna-full': {
            title: 'Full CCNA Practice Exam',
            questions: 100,
            timeLimit: 120,
            topics: ['OSPF', 'VLANs', 'ACLs', 'NAT', 'Subnetting', 'STP', 'IPv4', 'IPv6', 'DHCP', 'Security']
        },
        'ccna-network': {
            title: 'Network Fundamentals Exam',
            questions: 25,
            timeLimit: 30,
            topics: ['OSI', 'TCP/IP', 'IPv4', 'Subnetting', 'Network Fundamentals']
        },
        'ccna-routing': {
            title: 'IP Connectivity & Routing Exam',
            questions: 25,
            timeLimit: 30,
            topics: ['OSPF', 'Static Routing', 'VLAN', '802.1Q', 'STP', 'EtherChannel']
        },
        'ccna-security': {
            title: 'Security Fundamentals Exam',
            questions: 20,
            timeLimit: 25,
            topics: ['ACL', 'Port Security', 'AAA', 'VPN', 'Security']
        },
    };

    const examConfig = examConfigs[params.id as string] || {
        title: 'Practice Exam',
        questions: 25,
        timeLimit: 30,
        topics: ['Networking']
    };

    const startExam = async () => {
        setLoading(true);
        setError('');

        try {
            // First, try to fetch admin-created quizzes
            setGeneratingStatus('Checking for available quizzes...');
            const quizRes = await fetch(`/api/quiz?module=ccna`);
            const quizData = await quizRes.json();

            if (quizData.success && quizData.data.length > 0) {
                // Use admin-created quiz
                const quiz = quizData.data[0];
                setGeneratingStatus('Loading quiz questions...');

                const startRes = await fetch('/api/quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quizId: quiz.id }),
                });

                const startData = await startRes.json();
                if (startData.success) {
                    const formattedQuestions = startData.data.questions.map((q: any) => ({
                        ...q,
                        correctAnswer: '', // Will be checked on server
                    }));
                    setQuestions(formattedQuestions);
                    setAttemptId(startData.data.attemptId);
                    setTimeLeft(examConfig.timeLimit * 60);
                    setStarted(true);
                    return;
                }
            }

            // No admin quizzes available, generate with LLM
            setGeneratingStatus(`Generating ${examConfig.questions} AI-powered questions...`);
            const genRes = await fetch('/api/quiz/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examType: params.id,
                    topics: examConfig.topics,
                    questionCount: examConfig.questions
                }),
            });

            const genData = await genRes.json();
            if (genData.success) {
                setQuestions(genData.data.questions);
                setTimeLeft(examConfig.timeLimit * 60);
                setStarted(true);
            } else {
                setError(genData.error || 'Failed to generate questions');
            }
        } catch (err) {
            setError('Failed to load exam. Please try again.');
        } finally {
            setLoading(false);
            setGeneratingStatus('');
        }
    };

    // Timer
    useEffect(() => {
        if (!started || result) return;

        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    handleSubmit();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [started, result]);

    const handleAnswer = (questionId: string, answer: string) => {
        setAnswers(a => ({ ...a, [questionId]: answer }));
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(i => i + 1);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);

        // If we have an attemptId (admin quiz), submit to server
        if (attemptId) {
            try {
                const res = await fetch('/api/quiz/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        attemptId,
                        answers: Object.entries(answers).map(([questionId, answer]) => ({
                            questionId,
                            answer,
                        })),
                    }),
                });

                const data = await res.json();
                if (data.success) {
                    setResult(data.data);
                    setSubmitting(false);
                    return;
                }
            } catch (err) {
                // Fall through to local scoring
            }
        }

        // Local scoring for LLM-generated questions
        let correctCount = 0;
        questions.forEach(q => {
            const userAnswer = answers[q.id];
            if (userAnswer === q.correctAnswer) {
                correctCount++;
            }
        });

        const score = Math.round((correctCount / questions.length) * 100);
        setResult({
            score,
            passed: score >= 70,
            correctCount,
            incorrectCount: questions.length - correctCount,
            totalPoints: correctCount * 10,
            details: questions.map(q => ({
                question: q.questionText,
                yourAnswer: answers[q.id] || 'Not answered',
                correctAnswer: q.correctAnswer,
                isCorrect: answers[q.id] === q.correctAnswer,
                explanation: q.explanation,
            })),
        });
        setSubmitting(false);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Start screen
    if (!started) {
        return (
            <div className="max-w-2xl mx-auto text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h1 className="text-2xl font-bold mb-2">{examConfig.title}</h1>
                <p className="text-gray-500 mb-8">
                    {examConfig.questions} questions • {examConfig.timeLimit} minutes
                </p>

                <div className="card p-6 mb-8 text-left">
                    <h2 className="font-semibold mb-3">⚠️ Exam Rules</h2>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <li>• Timer starts immediately when you begin</li>
                        <li>• You cannot go back to previous questions</li>
                        <li>• Exam will auto-submit when time expires</li>
                        <li>• Passing score: 70%</li>
                        <li>• Questions are AI-generated based on CCNA topics</li>
                    </ul>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                {generatingStatus && (
                    <div className="bg-cisco-blue/10 text-cisco-blue p-4 rounded-lg mb-4 flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-cisco-blue border-t-transparent rounded-full" />
                        {generatingStatus}
                    </div>
                )}

                <div className="flex justify-center gap-4">
                    <Link href="/learn/exam" className="btn-outline">Back</Link>
                    <button
                        onClick={startExam}
                        disabled={loading}
                        className="btn-primary px-8"
                    >
                        {loading ? 'Preparing...' : 'Start Exam'}
                    </button>
                </div>
            </div>
        );
    }

    // Result screen
    if (result) {
        return (
            <div className="max-w-3xl mx-auto py-8">
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">{result.passed ? '🎉' : '📚'}</div>
                    <h1 className="text-2xl font-bold mb-2">
                        {result.passed ? 'Exam Passed!' : 'Keep Studying'}
                    </h1>
                    <p className="text-gray-500">Your score: {result.score}%</p>
                </div>

                <div className="card p-6 mb-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-green-600">{result.correctCount}</div>
                            <div className="text-sm text-gray-500">Correct</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-600">{result.incorrectCount}</div>
                            <div className="text-sm text-gray-500">Incorrect</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-cisco-blue">{result.totalPoints}</div>
                            <div className="text-sm text-gray-500">Points</div>
                        </div>
                    </div>
                </div>

                {/* Review answers */}
                {result.details && (
                    <div className="card p-6 mb-6">
                        <h3 className="font-bold mb-4">Review Your Answers</h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {result.details.map((d: any, i: number) => (
                                <div key={i} className={`p-4 rounded-lg border-l-4 ${d.isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    }`}>
                                    <p className="font-medium mb-2">{i + 1}. {d.question}</p>
                                    <p className="text-sm">
                                        Your answer: <span className={d.isCorrect ? 'text-green-600' : 'text-red-600'}>{d.yourAnswer}</span>
                                    </p>
                                    {!d.isCorrect && (
                                        <p className="text-sm text-green-600">Correct: {d.correctAnswer}</p>
                                    )}
                                    {d.explanation && (
                                        <p className="text-sm text-gray-600 mt-2 italic">{d.explanation}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-center gap-4">
                    <Link href="/learn/exam" className="btn-outline">More Exams</Link>
                    <Link href="/learn" className="btn-primary">Dashboard</Link>
                </div>
            </div>
        );
    }

    // Exam in progress
    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold">{examConfig.title}</h1>
                <div className={`px-4 py-2 rounded-lg font-mono font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                    ⏱️ {formatTime(timeLeft)}
                </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-cisco-blue transition-all"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
                <span className="text-sm text-gray-500">
                    {currentIndex + 1} / {questions.length}
                </span>
            </div>

            {/* Question */}
            <div className="card p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="text-sm text-gray-500">Question {currentIndex + 1}</span>
                        {currentQuestion.topic && (
                            <span className="ml-2 text-xs badge-secondary">{currentQuestion.topic}</span>
                        )}
                    </div>
                    <span className="text-sm text-cisco-blue">{currentQuestion.points} pts</span>
                </div>

                <h2 className="text-lg font-medium mb-6">{currentQuestion.questionText}</h2>

                <div className="space-y-3">
                    {currentQuestion.options.map((option, i) => {
                        const isSelected = answers[currentQuestion.id] === option;
                        return (
                            <button
                                key={i}
                                onClick={() => handleAnswer(currentQuestion.id, option)}
                                className={`w-full p-4 text-left rounded-lg border transition-all ${isSelected
                                    ? 'border-cisco-blue bg-cisco-blue/10'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-cisco-blue/50'
                                    }`}
                            >
                                <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                                {option}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Navigation - No going back in exam mode! */}
            <div className="flex justify-end">
                {isLastQuestion ? (
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn-primary"
                    >
                        {submitting ? 'Submitting...' : 'Submit Exam'}
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        disabled={!answers[currentQuestion.id]}
                        className="btn-primary disabled:opacity-50"
                    >
                        Next Question
                    </button>
                )}
            </div>
        </div>
    );
}
