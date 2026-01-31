'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Terminal,
    LayoutDashboard,
    BarChart3,
    ShieldAlert,
    Zap,
    Layers,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Globe,
    Plus,
    BookOpen
} from 'lucide-react';
import type { SessionUser } from '@/types';

const ADMIN_NAV = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/dashboard/labs', icon: Terminal, label: 'Labs Center' },
    { href: '/dashboard/flashcards', icon: BookOpen, label: 'Flashcards' },
    { href: '/dashboard/generation', icon: Zap, label: 'AI Generation' },
    { href: '/dashboard/quizzes', icon: Layers, label: 'Quiz Bank' },
    { href: '/dashboard/review', icon: ShieldAlert, label: 'Content Review' },
    { href: '/dashboard/users', icon: Users, label: 'User Hub' },
    { href: '/dashboard/analytics', icon: BarChart3, label: 'Global Stats' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
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
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-cisco-blue opacity-20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-cisco-blue border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 flex overflow-hidden">
            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: collapsed ? 80 : 280 }}
                className="relative z-50 glass border-r border-white/40 dark:border-white/5 shadow-2xl flex flex-col pt-8"
            >
                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-cisco-blue text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-transform z-50"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                {/* Brand */}
                <div className="px-6 mb-12 flex items-center justify-center">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-cisco-blue to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-cisco-blue/20">
                            <Globe className="w-7 h-7" />
                        </div>
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="text-xl font-black text-slate-900 dark:text-white tracking-tight"
                                >
                                    Admin<span className="text-cisco-blue">Hub</span>
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 space-y-1">
                    {ADMIN_NAV.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div className={`relative flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-3.5 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-cisco-blue text-white shadow-lg shadow-cisco-blue/20'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}>
                                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />
                                    <AnimatePresence>
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="ml-3 font-bold text-sm tracking-wide truncate"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="p-4 border-t border-white/40 dark:border-white/5 mt-auto">
                    {/* Switch to Student View */}
                    <Link href="/learn" className={`flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-3 mb-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-cisco-blue hover:border-cisco-blue/50 transition-all group`}>
                        <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        {!collapsed && (
                            <span className="ml-3 text-xs font-black uppercase tracking-widest">Student View</span>
                        )}
                    </Link>

                    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-2'}`}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-black text-slate-500 shadow-inner">
                            {user?.email?.[0]?.toUpperCase()}
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-tighter">{user?.email?.split('@')[0]}</p>
                                <p className="text-[10px] font-bold text-cisco-blue uppercase tracking-widest">{user?.role?.replace('_', ' ')}</p>
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <button
                            onClick={handleLogout}
                            className="w-full mt-6 py-3 rounded-xl border border-rose-500/10 text-rose-500 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        >
                            Log Out Session
                        </button>
                    )}
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-[url('/grid.svg')] bg-[length:40px_40px] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                <div className="p-8 md:p-12 max-w-7xl mx-auto">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
