'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface KnowledgeNode {
    id: string;
    topic: string;
    subtopic: string | null;
    intent: string;
    coreExplanation: string;
    mentalModel: string;
    wireLogic: string;
    cliExample: string | null;
    commonMistakes: string[];
    examNote: string | null;
    estimatedMinutes: number;
    difficulty: string;
}

export default function KnowledgeDetail() {
    const params = useParams();
    const [node, setNode] = useState<KnowledgeNode | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNode = async () => {
            if (!params.id) return;

            try {
                const response = await fetch(`/api/knowledge/${params.id}`);
                const data = await response.json();
                if (data.success) {
                    setNode(data.data);
                    // Mark as viewed (could be a separate API call or handled in GET)
                }
            } catch (error) {
                console.error('Failed to fetch node:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNode();
    }, [params.id]);

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
        );
    }

    if (!node) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
                <Link href="/learn/knowledge" className="btn-primary">
                    Back to Knowledge Hub
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="border-b dark:border-gray-700 pb-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Link href="/learn/knowledge" className="hover:text-cisco-blue">Knowledge</Link>
                    <span>/</span>
                    <span>{node.topic}</span>
                    {node.subtopic && (
                        <>
                            <span>/</span>
                            <span>{node.subtopic}</span>
                        </>
                    )}
                </div>
                <h1 className="text-3xl font-bold mb-4">
                    {node.intent.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </h1>
                <div className="flex gap-4 text-sm">
                    <span className={`px-2 py-1 rounded-full ${node.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                        node.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {node.difficulty.charAt(0).toUpperCase() + node.difficulty.slice(1)}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                        ⏱️ {node.estimatedMinutes} min read
                    </span>
                </div>
            </div>

            {/* Core Explanation */}
            <div className="prose dark:prose-invert max-w-none">
                <h2 className="flex items-center gap-2">
                    <span className="text-2xl">💡</span> Core Concept
                </h2>
                <div className="whitespace-pre-wrap">{node.coreExplanation}</div>
            </div>

            {/* Mental Model */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-cisco-blue p-6 rounded-r-lg">
                <h3 className="text-lg font-bold text-cisco-blue mb-2">🧠 Mental Model</h3>
                <p className="text-gray-700 dark:text-gray-300">{node.mentalModel}</p>
            </div>

            {/* Wire Logic */}
            <div className="prose dark:prose-invert max-w-none">
                <h3>🔌 How It Works (Wire Logic)</h3>
                <div className="whitespace-pre-wrap">{node.wireLogic}</div>
            </div>

            {/* CLI Example */}
            {node.cliExample && (
                <div className="card bg-gray-900 text-gray-100 p-0 overflow-hidden">
                    <div className="bg-gray-800 px-4 py-2 text-sm font-mono text-gray-400">
                        Configuration Example
                    </div>
                    <pre className="p-4 overflow-x-auto">
                        <code>{node.cliExample}</code>
                    </pre>
                </div>
            )}

            {/* Common Mistakes & Exam Notes */}
            <div className="grid md:grid-cols-2 gap-6">
                {node.commonMistakes.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-lg border border-red-100 dark:border-red-900/20">
                        <h3 className="font-bold text-red-600 mb-3">⚠️ Common Mistakes</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                            {node.commonMistakes.map((mistake, i) => (
                                <li key={i}>{mistake}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {node.examNote && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-lg border border-yellow-100 dark:border-yellow-900/20">
                        <h3 className="font-bold text-yellow-600 mb-2">📝 Exam Tip</h3>
                        <p className="text-gray-700 dark:text-gray-300">{node.examNote}</p>
                    </div>
                )}
            </div>

            {/* Completion Action */}
            <div className="flex justify-center pt-8 border-t dark:border-gray-700">
                <Link href="/learn/knowledge" className="btn-outline">
                    Return to Hub
                </Link>
                {/* Future: Add "Mark Complete" button here */}
            </div>
        </div>
    );
}
