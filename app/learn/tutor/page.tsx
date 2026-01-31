'use client';

import { useState, useRef, useEffect } from 'react';
import MarkdownMessage from '@/components/MarkdownMessage';

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
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 max-w-6xl mx-auto">
            {/* Minimal Header */}
            <div className="flex items-center justify-between px-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-3xl">✨</span> AI Tutor
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Ask questions about CCNA topics and get detailed explanations</p>
                </div>

                {/* Visual Settings Toggle */}
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${mode === 'exam' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                        {mode === 'exam' ? 'Exam Mode' : 'Learn Mode'}
                    </span>
                    <button
                        onClick={() => setMode(mode === 'learn' ? 'exam' : 'learn')}
                        className="text-xs text-slate-500 underline"
                    >
                        Switch
                    </button>
                </div>
            </div>

            {/* Main Chat Container */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden flex flex-col">

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-2xl mx-auto">
                            <div className="w-16 h-16 bg-gradient-to-br from-cisco-blue to-cyan-500 rounded-2xl flex items-center justify-center text-4xl shadow-lg mb-6 text-white">
                                🤖
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                                Hello! I am your CCNA study assistant.
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                                I can help you understand protocols, checking configurations, or practicing for the exam.
                                <br />What would you like to learn about today?
                            </p>

                            {/* Suggested Questions Grid */}
                            <div className="flex flex-wrap justify-center gap-3">
                                {suggestedQuestions.map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => setInput(q)}
                                        className="px-4 py-2 bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-xl text-sm text-slate-600 dark:text-slate-300 transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {/* Avatar for Assistant */}
                                    {message.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cisco-blue to-cyan-500 flex items-center justify-center text-white text-xs mr-3 flex-shrink-0 mt-1">
                                            AI
                                        </div>
                                    )}

                                    <div
                                        className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${message.role === 'user'
                                            ? 'bg-slate-900 text-white rounded-br-none'
                                            : 'bg-slate-50 dark:bg-gray-700/50 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-gray-600 rounded-bl-none'
                                            }`}
                                    >
                                        <MarkdownMessage content={message.content} isUser={message.role === 'user'} />

                                        {/* Follow-ups */}
                                        {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-slate-200/50">
                                                <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">Suggested follow-ups</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {message.followUpQuestions.map((q, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => askFollowUp(q)}
                                                            className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg text-xs font-medium border border-slate-200 dark:border-gray-600 hover:border-cisco-blue transition-colors text-cisco-blue"
                                                        >
                                                            {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Metadata */}
                                        {message.source && !message.role.includes('user') && (
                                            <div className="mt-2 flex items-center gap-2 opacity-50 text-[10px] uppercase tracking-wider">
                                                <span>Source: {message.source}</span>
                                                {message.latency && <span>• {message.latency}ms</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cisco-blue to-cyan-500 flex items-center justify-center text-white text-xs mr-3 flex-shrink-0 mt-1">
                                        AI
                                    </div>
                                    <div className="bg-slate-50 dark:bg-gray-700/50 rounded-2xl p-4 border border-slate-100 dark:border-gray-600 rounded-bl-none flex items-center gap-2">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700">
                    <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? 'Listening...' : 'Ask about CCNA topics, configurations, or concepts...'}
                            className="w-full pl-6 pr-32 py-4 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cisco-blue/20 focus:border-cisco-blue transition-all disabled:opacity-50"
                            disabled={loading || isListening}
                        />

                        <div className="absolute right-2 top-2 bottom-2 flex items-center gap-2">
                            {/* Voice Button */}
                            {speechSupported && (
                                <button
                                    type="button"
                                    onClick={isListening ? stopListening : startListening}
                                    className={`p-2 rounded-xl transition-all ${isListening
                                        ? 'bg-red-50 text-red-600 animate-pulse'
                                        : 'hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    🎤
                                </button>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                                </svg>
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-xs text-slate-400 mt-3">
                        AI can make mistakes. Always verify with official Cisco documentation.
                    </p>
                </div>
            </div>
        </div>
    );
}
