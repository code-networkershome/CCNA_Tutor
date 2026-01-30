'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ScenarioOption {
    id: string;
    text: string;
    correct: boolean;
    feedback: string;
}

interface ScenarioStep {
    stepNumber: number;
    question: string;
    options: ScenarioOption[];
    cliOutput: string;
    explanation: string;
}

interface Scenario {
    id: string;
    title: string;
    difficulty: string;
    topic: string;
    situation: string;
    topology: string;
    initialInfo: string[];
    steps: ScenarioStep[];
    summary: string;
    examTip: string;
}

export default function ScenariosPage() {
    const [scenarios, setScenarios] = useState<{ topics: string[]; difficulties: string[] } | null>(null);
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('intermediate');
    const [loading, setLoading] = useState(false);
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [score, setScore] = useState(0);
    const [hint, setHint] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [hintsUsed, setHintsUsed] = useState(0);

    useEffect(() => {
        fetchScenarioOptions();
    }, []);

    const fetchScenarioOptions = async () => {
        try {
            const response = await fetch('/api/tutor/scenario');
            const data = await response.json();
            if (data.success) {
                setScenarios(data.data);
                if (data.data.topics.length > 0) {
                    setSelectedTopic(data.data.topics[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch scenarios:', error);
        }
    };

    const startScenario = async () => {
        setLoading(true);
        setScenario(null);
        setCurrentStep(0);
        setCompletedSteps([]);
        setScore(0);
        setHintsUsed(0);

        try {
            const response = await fetch('/api/tutor/scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: selectedTopic,
                    difficulty: selectedDifficulty,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setScenario(data.data);
            }
        } catch (error) {
            console.error('Failed to start scenario:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (optionId: string) => {
        setSelectedAnswer(optionId);
        setShowFeedback(true);

        const step = scenario?.steps[currentStep];
        const option = step?.options.find(o => o.id === optionId);

        if (option?.correct) {
            setScore(s => s + (showHint ? 5 : 10)); // Less points if hint was used
            setCompletedSteps([...completedSteps, currentStep]);
        }
    };

    const nextStep = () => {
        setSelectedAnswer(null);
        setShowFeedback(false);
        setShowHint(false);
        setHint('');

        if (currentStep < (scenario?.steps.length || 0) - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const getHint = async () => {
        try {
            const response = await fetch('/api/tutor/scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'hint',
                    topic: selectedTopic,
                    step: currentStep + 1,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setHint(data.data.hint);
                setShowHint(true);
                setHintsUsed(h => h + 1);
            }
        } catch (error) {
            setHint('Consider the OSI model layers relevant to this problem.');
            setShowHint(true);
        }
    };

    const resetScenario = () => {
        setScenario(null);
        setCurrentStep(0);
        setSelectedAnswer(null);
        setShowFeedback(false);
        setCompletedSteps([]);
        setScore(0);
        setHint('');
        setShowHint(false);
    };

    const isCompleted = scenario && currentStep === scenario.steps.length - 1 && showFeedback;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">🔧 Troubleshooting Scenarios</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Practice real-world network troubleshooting with guided scenarios
                    </p>
                </div>
                <Link href="/learn" className="btn-outline">
                    ← Back
                </Link>
            </div>

            {!scenario ? (
                // Scenario Selection
                <div className="max-w-2xl mx-auto">
                    <div className="card p-8">
                        <div className="text-center mb-8">
                            <div className="text-6xl mb-4">🔍</div>
                            <h2 className="text-xl font-bold mb-2">Choose Your Scenario</h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Select a troubleshooting topic and difficulty level
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">Topic</label>
                                <select
                                    value={selectedTopic}
                                    onChange={(e) => setSelectedTopic(e.target.value)}
                                    className="input w-full"
                                >
                                    {scenarios?.topics.map((topic) => (
                                        <option key={topic} value={topic}>
                                            {topic}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Difficulty</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['beginner', 'intermediate', 'advanced'].map((diff) => (
                                        <button
                                            key={diff}
                                            onClick={() => setSelectedDifficulty(diff)}
                                            className={`p-3 rounded-lg border-2 transition-all ${selectedDifficulty === diff
                                                    ? 'border-cisco-blue bg-cisco-blue/10'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-cisco-blue/50'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">
                                                {diff === 'beginner' ? '🌱' : diff === 'intermediate' ? '🌿' : '🌳'}
                                            </div>
                                            <div className="text-sm font-medium capitalize">{diff}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={startScenario}
                                disabled={loading || !selectedTopic}
                                className="btn-primary w-full py-3 text-lg"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                        Generating Scenario...
                                    </span>
                                ) : (
                                    'Start Troubleshooting'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : isCompleted ? (
                // Completion Screen
                <div className="max-w-3xl mx-auto">
                    <div className="card p-8 text-center">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold mb-2">Scenario Complete!</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {scenario.title}
                        </p>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{score}</div>
                                <div className="text-sm text-gray-600">Points Earned</div>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{completedSteps.length}/{scenario.steps.length}</div>
                                <div className="text-sm text-gray-600">Correct First Try</div>
                            </div>
                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <div className="text-2xl font-bold text-orange-600">{hintsUsed}</div>
                                <div className="text-sm text-gray-600">Hints Used</div>
                            </div>
                        </div>

                        <div className="text-left mb-6">
                            <h3 className="font-bold mb-2">📝 Summary</h3>
                            <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                {scenario.summary}
                            </p>
                        </div>

                        <div className="text-left mb-8">
                            <h3 className="font-bold mb-2">💡 Exam Tip</h3>
                            <p className="text-cisco-blue bg-cisco-blue/10 p-4 rounded-lg">
                                {scenario.examTip}
                            </p>
                        </div>

                        <div className="flex justify-center gap-4">
                            <button onClick={resetScenario} className="btn-outline">
                                Try Another Scenario
                            </button>
                            <Link href="/learn" className="btn-primary">
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                // Active Scenario
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Scenario Header */}
                    <div className="card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-bold text-lg">{scenario.title}</h2>
                            <span className={`badge ${scenario.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                                    scenario.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                }`}>
                                {scenario.difficulty}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {scenario.situation}
                        </p>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2">
                        {scenario.steps.map((_, i) => (
                            <div
                                key={i}
                                className={`flex-1 h-2 rounded-full ${i < currentStep ? 'bg-green-500' :
                                        i === currentStep ? 'bg-cisco-blue' :
                                            'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            />
                        ))}
                        <span className="text-sm text-gray-500">
                            Step {currentStep + 1}/{scenario.steps.length}
                        </span>
                    </div>

                    {/* Current Step */}
                    <div className="card p-6">
                        <h3 className="font-bold text-lg mb-4">
                            {scenario.steps[currentStep].question}
                        </h3>

                        {/* Hint */}
                        {showHint && (
                            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
                                <span className="font-medium">💡 Hint: </span>
                                {hint}
                            </div>
                        )}

                        {/* Options */}
                        <div className="grid gap-3">
                            {scenario.steps[currentStep].options.map((option) => {
                                const isSelected = selectedAnswer === option.id;
                                const showResult = showFeedback && isSelected;

                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => !showFeedback && handleAnswer(option.id)}
                                        disabled={showFeedback}
                                        className={`p-4 text-left rounded-lg border-2 transition-all ${showResult
                                                ? option.correct
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                : showFeedback && option.correct
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                    : isSelected
                                                        ? 'border-cisco-blue bg-cisco-blue/10'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-cisco-blue/50'
                                            } ${showFeedback ? 'cursor-default' : 'cursor-pointer'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="font-mono font-bold uppercase">{option.id}.</span>
                                            <div className="flex-1">
                                                <div>{option.text}</div>
                                                {showFeedback && (isSelected || option.correct) && (
                                                    <div className={`mt-2 text-sm ${option.correct ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {option.feedback}
                                                    </div>
                                                )}
                                            </div>
                                            {showResult && (
                                                <span className="text-xl">
                                                    {option.correct ? '✅' : '❌'}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* CLI Output after correct answer */}
                        {showFeedback && (
                            <div className="mt-6">
                                <h4 className="font-medium mb-2">📟 CLI Output:</h4>
                                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                                    {scenario.steps[currentStep].cliOutput}
                                </pre>
                                <p className="mt-3 text-gray-600 dark:text-gray-400">
                                    {scenario.steps[currentStep].explanation}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between">
                        <div>
                            {!showFeedback && (
                                <button
                                    onClick={getHint}
                                    disabled={showHint}
                                    className="btn-outline"
                                >
                                    💡 Get Hint
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={resetScenario} className="btn-outline">
                                Restart
                            </button>
                            {showFeedback && currentStep < scenario.steps.length - 1 && (
                                <button onClick={nextStep} className="btn-primary">
                                    Next Step →
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Score */}
                    <div className="text-center text-sm text-gray-500">
                        Current Score: {score} points | Hints Used: {hintsUsed}
                    </div>
                </div>
            )}
        </div>
    );
}
