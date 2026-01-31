'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
    content: string;
    isUser?: boolean;
}

// Custom component for collapsible sections
const CollapsibleSection: React.FC<{ title: string; emoji: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
    title,
    emoji,
    children,
    defaultOpen = true
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="my-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <span className="font-semibold flex items-center gap-2">
                    <span className="text-lg">{emoji}</span>
                    {title}
                </span>
                <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>
            <div className={`transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Code block with copy button
const CodeBlock: React.FC<{ children: string; language?: string }> = ({ children, language }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative my-3 group">
            <div className="absolute right-2 top-2 z-10">
                <button
                    onClick={handleCopy}
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
            </div>
            {language && (
                <div className="absolute left-3 top-2 text-xs text-gray-400 font-mono">
                    {language}
                </div>
            )}
            <pre className="bg-gray-900 text-green-400 p-4 pt-8 rounded-lg overflow-x-auto font-mono text-sm border border-gray-700">
                <code>{children}</code>
            </pre>
        </div>
    );
};

// Main Markdown Message Component
export default function MarkdownMessage({ content, isUser = false }: MarkdownMessageProps) {
    if (isUser) {
        return <div className="text-sm">{content}</div>;
    }

    // Parse content for sections
    const parseContent = (text: string) => {
        // Split by section headers
        const sections = text.split(/(?=###?\s)/);
        return sections;
    };

    // Detect section type from header
    const getSectionInfo = (header: string): { emoji: string; title: string; type: string } | null => {
        const emojiMatch = header.match(/###?\s*([🧠📡💻⚠️📝🔑💡🎯✅❌📚🌐🔧⭐])\s*(.+)/);
        if (emojiMatch) {
            return { emoji: emojiMatch[1], title: emojiMatch[2].trim(), type: 'section' };
        }

        const headerMatch = header.match(/###?\s*(.+)/);
        if (headerMatch) {
            const title = headerMatch[1].trim();
            // Assign emojis based on common section types
            if (title.toLowerCase().includes('mental model')) return { emoji: '🧠', title, type: 'mental' };
            if (title.toLowerCase().includes('how it works')) return { emoji: '📡', title, type: 'how' };
            if (title.toLowerCase().includes('cli') || title.toLowerCase().includes('example')) return { emoji: '💻', title, type: 'cli' };
            if (title.toLowerCase().includes('mistake') || title.toLowerCase().includes('warning')) return { emoji: '⚠️', title, type: 'warning' };
            if (title.toLowerCase().includes('tip') || title.toLowerCase().includes('note')) return { emoji: '📝', title, type: 'tip' };
            if (title.toLowerCase().includes('key')) return { emoji: '🔑', title, type: 'key' };
            return { emoji: '📌', title, type: 'section' };
        }
        return null;
    };

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Custom heading renderer
                    h2: ({ children }) => (
                        <h2 className="text-xl font-bold text-cisco-blue border-b-2 border-cisco-blue/30 pb-2 mb-4 flex items-center gap-2">
                            <span className="text-2xl">📚</span>
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => {
                        const text = String(children);
                        const info = getSectionInfo(`### ${text}`);
                        if (info) {
                            return (
                                <h3 className="text-lg font-semibold mt-6 mb-3 flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                    <span className="text-xl">{info.emoji}</span>
                                    {info.title}
                                </h3>
                            );
                        }
                        return <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>;
                    },
                    // Custom code block
                    code: ({ className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !className;

                        if (isInline) {
                            return (
                                <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-cisco-blue font-mono text-sm" {...props}>
                                    {children}
                                </code>
                            );
                        }

                        return (
                            <CodeBlock language={match?.[1]}>
                                {String(children).replace(/\n$/, '')}
                            </CodeBlock>
                        );
                    },
                    // Custom pre to avoid double wrapping
                    pre: ({ children }) => <>{children}</>,
                    // Enhanced paragraph
                    p: ({ children }) => (
                        <p className="my-3 leading-relaxed text-gray-700 dark:text-gray-300">
                            {children}
                        </p>
                    ),
                    // Enhanced lists
                    ul: ({ children }) => (
                        <ul className="my-3 space-y-2 list-none pl-0">
                            {children}
                        </ul>
                    ),
                    li: ({ children }) => (
                        <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                            <span className="text-cisco-blue mt-1">•</span>
                            <span>{children}</span>
                        </li>
                    ),
                    // Enhanced links
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            className="text-cisco-blue hover:underline font-medium"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {children} ↗
                        </a>
                    ),
                    // Enhanced blockquote for tips/notes
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-cisco-blue bg-blue-50 dark:bg-blue-900/20 p-4 my-4 rounded-r-lg italic">
                            {children}
                        </blockquote>
                    ),
                    // Enhanced strong
                    strong: ({ children }) => (
                        <strong className="font-bold text-gray-900 dark:text-white">
                            {children}
                        </strong>
                    ),
                    // Enhanced tables
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-gray-100 dark:bg-gray-800">
                            {children}
                        </thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-4 py-2 text-left font-semibold border-b border-gray-200 dark:border-gray-700">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                            {children}
                        </td>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
