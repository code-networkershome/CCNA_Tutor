'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { SessionUser } from '@/types';

const adminNavItems = [
    { href: '/dashboard', icon: '📊', label: 'Dashboard' },
    // Knowledge removed
    { href: '/dashboard/flashcards', icon: '🎴', label: 'Flashcards' },
    { href: '/dashboard/generation', icon: '🤖', label: 'Generation' },
    { href: '/dashboard/review', icon: '✅', label: 'Review Queue' },
    { href: '/dashboard/quizzes', icon: '⚡', label: 'Quizzes' },
    { href: '/dashboard/labs', icon: '💻', label: 'Labs' },
    { href: '/dashboard/users', icon: '👥', label: 'Users' },
    { href: '/dashboard/analytics', icon: '📈', label: 'Analytics' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch('/api/auth/session');
                const data = await response.json();
                if (data.success) {
                    const adminRoles = ['content_admin', 'super_admin', 'admin', 'faculty_reviewer'];
                    if (!adminRoles.includes(data.data.role)) {
                        router.push('/learn');
                        return;
                    }
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin h-10 w-10 border-4 border-cisco-blue border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 bg-cisco-dark transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
                <div className="h-full flex flex-col text-white">
                    {/* Logo */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <svg className="w-8 h-8 text-cisco-blue" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            {!sidebarCollapsed && <span className="font-bold text-lg">Admin</span>}
                        </Link>
                        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1 hover:bg-white/10 rounded">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                        {adminNavItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                        ? 'bg-cisco-blue text-white'
                                        : 'text-gray-300 hover:bg-white/10'
                                        }`}
                                    title={sidebarCollapsed ? item.label : undefined}
                                >
                                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                                    {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User */}
                    <div className="p-4 border-t border-white/10">
                        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                            <div className="w-8 h-8 rounded-full bg-cisco-blue flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                {user?.email?.[0]?.toUpperCase()}
                            </div>
                            {!sidebarCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user?.email}</p>
                                    <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
                                </div>
                            )}
                        </div>
                        {!sidebarCollapsed && (
                            <button onClick={handleLogout} className="w-full mt-3 text-sm text-gray-400 hover:text-white py-1.5 rounded hover:bg-white/10">
                                Sign Out
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
