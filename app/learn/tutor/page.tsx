'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    source?: 'cache' | 'database' | 'llm';
    latency?: number;
    followUpQuestions?: string[];
}

export default function TutorPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'learn' | 'exam'>('learn');
    const [style, setStyle] = useState<'direct' | 'socratic'>('direct');
    const [difficulty, setDifficulty] = useState<'eli5' | 'beginner' | 'intermediate' | 'expert'>('intermediate');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Check for speech recognition support
            const SpeechRecognitionAPI = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

            if (SpeechRecognitionAPI) {
                setSpeechSupported(true);
                recognitionRef.current = new SpeechRecognitionAPI();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInput(transcript);
                    setIsListening(false);
                };

                recognitionRef.current.onerror = () => {
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, []);

    const speakText = (text: string) => {
        if ('speechSynthesis' in window && voiceEnabled) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            // Clean text for speech
            const cleanText = text
                .replace(/```[\s\S]*?```/g, 'code example')
                .replace(/#{1,6}\s/g, '')
                .replace(/\*\*/g, '')
                .replace(/\n+/g, '. ');

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);

            window.speechSynthesis.speak(utterance);
        }
    };

    const stopSpeaking = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    const startListening = () => {
        if (recognitionRef.current) {
            setIsListening(true);
            recognitionRef.current.start();
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/runtime/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: userMessage.content,
                    module: 'ccna',
                    mode,
                    style,
                    difficulty,
                }),
            });

            const data = await response.json();

            if (data.success) {
                const tutorResponse = data.data;
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: formatResponse(tutorResponse),
                    source: tutorResponse.source,
                    latency: tutorResponse.latency,
                    followUpQuestions: tutorResponse.followUpQuestions,
                };
                setMessages((prev) => [...prev, assistantMessage]);

                // Auto-speak if voice is enabled
                if (voiceEnabled) {
                    speakText(formatResponse(tutorResponse));
                }
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: `Sorry, I encountered an error: ${data.error}`,
                    },
                ]);
            }
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: 'Sorry, there was a network error. Please try again.',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const formatResponse = (response: any) => {
        let formatted = `## ${response.topic}\n\n`;
        formatted += `${response.explanation.concept}\n\n`;

        if (response.explanation.mentalModel) {
            formatted += `### 🧠 Mental Model\n${response.explanation.mentalModel}\n\n`;
        }

        if (response.explanation.wireLogic) {
            formatted += `### 📡 How It Works\n${response.explanation.wireLogic}\n\n`;
        }

        if (response.explanation.cliExample) {
            formatted += `### 💻 CLI Example\n\`\`\`\n${response.explanation.cliExample}\n\`\`\`\n\n`;
        }

        if (response.commonMistakes?.length > 0) {
            formatted += `### ⚠️ Common Mistakes\n${response.commonMistakes.map((m: string) => `• ${m}`).join('\n')}\n\n`;
        }

        if (response.examNote) {
            formatted += `### 📝 Exam Tip\n${response.examNote}`;
        }

        return formatted;
    };

    const askFollowUp = (question: string) => {
        setInput(question);
    };

    const learningQuestions = [
        'What is a VLAN and why use it?',
        'How does OSPF calculate the best path?',
        'What is the difference between TCP and UDP?',
        'How does NAT work?',
        'Explain STP and why we need it',
    ];

    const examQuestions = [
        'What port does HTTPS use?',
        'Which layer does a switch operate at?',
        'What is the default OSPF cost for a 1Gbps link?',
        'What is the subnet mask for /26?',
        'Which protocol uses port 53?',
    ];

    const suggestedQuestions = mode === 'exam' ? examQuestions : learningQuestions;

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold">🤖 AI Tutor</h1>
                    <p className="text-gray-600 dark:text-gray-400">Ask me anything about CCNA topics</p>
                </div>
            </div>

            {/* Settings Bar */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-4">
                {/* Mode */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase">Mode:</span>
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as 'learn' | 'exam')}
                        className="input py-1 px-3 text-sm"
                    >
                        <option value="learn">📚 Learn</option>
                        <option value="exam">📝 Exam</option>
                    </select>
                </div>

                {/* Teaching Style */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase">Style:</span>
                    <select
                        value={style}
                        onChange={(e) => setStyle(e.target.value as 'direct' | 'socratic')}
                        className="input py-1 px-3 text-sm"
                    >
                        <option value="direct">💬 Direct Answers</option>
                        <option value="socratic">🤔 Socratic (Guided)</option>
                    </select>
                </div>

                {/* Difficulty */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase">Level:</span>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value as any)}
                        className="input py-1 px-3 text-sm"
                    >
                        <option value="eli5">👶 ELI5 (Simple)</option>
                        <option value="beginner">🌱 Beginner</option>
                        <option value="intermediate">🌿 Intermediate</option>
                        <option value="expert">🌳 Expert</option>
                    </select>
                </div>

                {/* Voice Toggle */}
                <div className="flex items-center gap-2 ml-auto">
                    <button
                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                        className={`p-2 rounded-lg transition-colors ${voiceEnabled
                            ? 'bg-cisco-blue text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                        title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
                    >
                        {voiceEnabled ? '🔊' : '🔇'}
                    </button>
                    {isSpeaking && (
                        <button
                            onClick={stopSpeaking}
                            className="p-2 rounded-lg bg-red-500 text-white animate-pulse"
                            title="Stop speaking"
                        >
                            ⏹️
                        </button>
                    )}
                </div>
            </div>

            {/* Style Info Banner */}
            {mode === 'exam' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-3 mb-4 rounded text-sm">
                    <strong>📝 Exam Mode:</strong> Responses will be concise, exam-focused, and highlight what Cisco typically tests.
                </div>
            )}

            {style === 'socratic' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 mb-4 rounded text-sm">
                    <strong>🤔 Socratic Mode:</strong> I&apos;ll guide you to discover answers through questions rather than giving direct answers.
                </div>
            )}

            {difficulty === 'eli5' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 mb-4 rounded text-sm">
                    <strong>👶 ELI5 Mode:</strong> Explanations will use simple everyday analogies without technical jargon.
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 card overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🤖</div>
                            <h2 className="text-xl font-semibold mb-2">
                                {mode === 'exam' ? '🎯 Ready for Exam Practice?' : 'How can I help you?'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {mode === 'exam'
                                    ? 'Quick-fire questions to test your CCNA knowledge'
                                    : 'Ask me about any CCNA networking concept'
                                }
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {suggestedQuestions.map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => setInput(q)}
                                        className="btn-outline text-sm"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-xl p-4 ${message.role === 'user'
                                        ? 'bg-cisco-blue text-white'
                                        : 'bg-gray-100 dark:bg-gray-800'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                                    {/* Follow-up Questions (Socratic Mode) */}
                                    {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <p className="text-xs font-medium mb-2 opacity-70">💡 Think about:</p>
                                            <div className="space-y-1">
                                                {message.followUpQuestions.map((q, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => askFollowUp(q)}
                                                        className="block text-left text-xs text-cisco-blue hover:underline"
                                                    >
                                                        → {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Source & Voice */}
                                    {message.source && (
                                        <div className="mt-2 text-xs opacity-70 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`badge ${message.source === 'cache' ? 'badge-success' :
                                                    message.source === 'database' ? 'badge-primary' : 'badge-warning'
                                                    }`}>
                                                    {message.source}
                                                </span>
                                                {message.latency && <span>{message.latency}ms</span>}
                                            </div>
                                            {voiceEnabled && message.role === 'assistant' && (
                                                <button
                                                    onClick={() => speakText(message.content)}
                                                    className="hover:opacity-100 opacity-50 transition-opacity"
                                                    title="Read aloud"
                                                >
                                                    🔊
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-cisco-blue rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-cisco-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                    <div className="w-2 h-2 bg-cisco-blue rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
                    <div className="flex gap-2">
                        {/* Voice Input Button - Always show if supported */}
                        {speechSupported && (
                            <button
                                type="button"
                                onClick={isListening ? stopListening : startListening}
                                className={`p-3 rounded-lg transition-colors ${isListening
                                    ? 'bg-red-500 text-white animate-pulse'
                                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                title={isListening ? 'Stop listening' : 'Voice input'}
                            >
                                🎤
                            </button>
                        )}
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? 'Listening...' : 'Ask about VLANs, OSPF, subnetting...'}
                            className="input flex-1"
                            disabled={loading || isListening}
                        />
                        <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-6">
                            Send
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
