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

interface QuizData {
    attemptId: string;
    quiz: {
        id: string;
        title: string;
        timeLimit: number;
        questionCount: number;
    };
    questions: Question[];
}

export default function TakeQuizPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [quizData, setQuizData] = useState<QuizData | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isLLMGenerated, setIsLLMGenerated] = useState(false);
    const [quizTitle, setQuizTitle] = useState('Practice Quiz');

    // Sample quiz mapping for fallback generation
    const sampleQuizzes: Record<string, { title: string; topics: string[]; questionCount: number; timeLimit: number }> = {
        '1': { title: 'Network Fundamentals', topics: ['OSI', 'TCP/IP'], questionCount: 10, timeLimit: 15 },
        '2': { title: 'IPv4 Addressing', topics: ['IPv4', 'Subnetting'], questionCount: 15, timeLimit: 20 },
        '3': { title: 'IPv6 Fundamentals', topics: ['IPv6'], questionCount: 10, timeLimit: 15 },
        '4': { title: 'VLANs & Trunking', topics: ['VLAN', '802.1Q'], questionCount: 10, timeLimit: 12 },
        '5': { title: 'Spanning Tree Protocol', topics: ['STP', 'RSTP'], questionCount: 10, timeLimit: 15 },
        '6': { title: 'EtherChannel', topics: ['EtherChannel', 'LACP'], questionCount: 8, timeLimit: 10 },
        '7': { title: 'Wireless Networking', topics: ['Wireless', 'WLAN'], questionCount: 10, timeLimit: 12 },
        '8': { title: 'Static Routing', topics: ['Static Routing'], questionCount: 8, timeLimit: 10 },
        '9': { title: 'OSPF Routing', topics: ['OSPF'], questionCount: 12, timeLimit: 15 },
        '10': { title: 'First Hop Redundancy', topics: ['FHRP', 'HSRP'], questionCount: 8, timeLimit: 10 },
        '11': { title: 'NAT & PAT', topics: ['NAT', 'PAT'], questionCount: 10, timeLimit: 12 },
        '12': { title: 'DHCP & DNS', topics: ['DHCP', 'DNS'], questionCount: 8, timeLimit: 10 },
        '13': { title: 'NTP & SNMP', topics: ['NTP', 'SNMP'], questionCount: 8, timeLimit: 10 },
        '14': { title: 'QoS Fundamentals', topics: ['QoS'], questionCount: 8, timeLimit: 10 },
        '15': { title: 'Access Control Lists', topics: ['ACL'], questionCount: 12, timeLimit: 15 },
        '16': { title: 'Port Security', topics: ['Port Security'], questionCount: 10, timeLimit: 12 },
        '17': { title: 'AAA & 802.1X', topics: ['AAA', '802.1X'], questionCount: 8, timeLimit: 10 },
        '18': { title: 'VPN Fundamentals', topics: ['VPN', 'IPSec'], questionCount: 8, timeLimit: 10 },
        '19': { title: 'Network Automation', topics: ['Automation', 'API'], questionCount: 10, timeLimit: 12 },
        '20': { title: 'SDN & Controllers', topics: ['SDN', 'DNA Center'], questionCount: 8, timeLimit: 10 },
        '21': { title: 'Configuration Management', topics: ['Ansible'], questionCount: 8, timeLimit: 10 },
        '22': { title: 'Mixed Review', topics: ['Mixed'], questionCount: 20, timeLimit: 25 },
        '23': { title: 'CCNA Practice Exam 1', topics: ['Exam'], questionCount: 50, timeLimit: 60 },
        '24': { title: 'CCNA Practice Exam 2', topics: ['Exam'], questionCount: 50, timeLimit: 60 },
    };

    useEffect(() => {
        const startQuiz = async () => {
            try {
                // Try to start admin-created quiz
                const res = await fetch('/api/quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quizId: params.id }),
                });

                const data = await res.json();
                if (data.success) {
                    setQuizData(data.data);
                    setQuestions(data.data.questions);
                    setTimeLeft((data.data.quiz.timeLimit || 15) * 60);
                } else {
                    // Quiz not found in database, use sample quiz info for LLM generation
                    setIsLLMGenerated(true);

                    const quizId = params.id as string;
                    const sampleQuiz = sampleQuizzes[quizId];

                    if (sampleQuiz) {
                        setQuizTitle(sampleQuiz.title);
                    }

                    const genRes = await fetch('/api/quiz/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            topic: sampleQuiz?.topics[0] || 'Networking',
                            topics: sampleQuiz?.topics || ['Networking'],
                            questionCount: sampleQuiz?.questionCount || 10
                        }),
                    });

                    const genData = await genRes.json();
                    if (genData.success) {
                        setQuestions(genData.data.questions);
                        setTimeLeft((sampleQuiz?.timeLimit || 15) * 60);
                    } else {
                        setError(genData.error || 'Failed to load quiz');
                    }
                }
            } catch (err) {
                setError('Failed to load quiz');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            startQuiz();
        }
    }, [params.id]);

    // Timer
    useEffect(() => {
        if (loading || result || questions.length === 0) return;

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
    }, [loading, result, questions.length]);

    const handleAnswer = (questionId: string, answer: string | string[]) => {
        setAnswers(a => ({ ...a, [questionId]: answer }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);

        // If it's an admin quiz, submit to server
        if (quizData?.attemptId) {
            try {
                const res = await fetch('/api/quiz/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        attemptId: quizData.attemptId,
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

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
                <div className="animate-spin h-8 w-8 border-4 border-cisco-blue border-t-transparent rounded-full" />
                <p className="text-gray-500">Loading quiz questions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-5xl mb-4">❌</div>
                <h1 className="text-xl font-bold mb-2">Error</h1>
                <p className="text-gray-500 mb-4">{error}</p>
                <Link href="/learn/quiz" className="btn-primary">Back to Quizzes</Link>
            </div>
        );
    }

    if (result) {
        return (
            <div className="max-w-3xl mx-auto py-8">
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">{result.passed ? '🎉' : '📚'}</div>
                    <h1 className="text-2xl font-bold mb-2">
                        {result.passed ? 'Congratulations!' : 'Keep Practicing!'}
                    </h1>
                    <p className="text-gray-500">You scored {result.score}%</p>
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
                            <div className="text-sm text-gray-500">Points Earned</div>
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
                    <Link href="/learn/quiz" className="btn-outline">Back to Quizzes</Link>
                    <Link href="/learn" className="btn-primary">Dashboard</Link>
                </div>
            </div>
        );
    }

    if (questions.length === 0) return null;

    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">{quizData?.quiz?.title || quizTitle}</h1>
                    {isLLMGenerated && (
                        <span className="text-xs text-gray-500">AI-Generated Questions</span>
                    )}
                </div>
                <div className={`px-4 py-2 rounded-lg font-mono font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-gray-100 dark:bg-gray-800'
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

            {/* Navigation */}
            <div className="flex justify-between">
                <button
                    onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    className="btn-outline disabled:opacity-50"
                >
                    Previous
                </button>

                {isLastQuestion ? (
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn-primary"
                    >
                        {submitting ? 'Submitting...' : 'Submit Quiz'}
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentIndex(i => i + 1)}
                        className="btn-primary"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
}
