'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { SessionUser } from '@/types';

const navItems = [
    { href: '/learn', icon: '📚', label: 'Learn' },
    { href: '/learn/topics', icon: '📖', label: 'Topics' },
    { href: '/learn/tutor', icon: '🤖', label: 'AI Tutor' },
    { href: '/learn/quiz', icon: '⚡', label: 'Quizzes' },
    { href: '/learn/flashcards', icon: '🎴', label: 'Flashcards' },
    { href: '/learn/labs', icon: '💻', label: 'Labs' },
    { href: '/learn/exam', icon: '📝', label: 'Exam Mode' },
    { href: '/learn/progress', icon: '📊', label: 'Progress' },
];

export default function LearnLayout({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch('/api/auth/session');
                const data = await response.json();
                if (data.success) {
                    setUser(data.data);
                } else {
                    router.push('/login');
                }
            } catch (error) {
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [router]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-cisco-blue border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 shadow-sm px-4 py-3 flex items-center justify-between">
                <button onClick={() => setSidebarOpen(true)} className="p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <Link href="/learn" className="flex items-center space-x-2">
                    <svg className="w-8 h-8 text-cisco-blue" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <span className="font-bold">CCNA Tutor</span>
                </Link>
                <div className="w-10" />
            </header>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    {/* Logo */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <Link href="/learn" className="flex items-center space-x-2" onClick={() => setSidebarOpen(false)}>
                            <svg className="w-10 h-10 text-cisco-blue" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            <span className="text-xl font-bold">CCNA Tutor</span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-cisco-blue text-white'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Section */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-cisco-blue flex items-center justify-center text-white font-semibold">
                                {user?.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user?.email}</p>
                                <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="btn-ghost w-full justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
