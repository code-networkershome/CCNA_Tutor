'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Users,
    Terminal,
    Layout,
    BarChart3,
    ArrowUpRight,
    Activity,
    Zap,
    Shield,
    Globe,
    Plus,
    Search,
    MoreVertical,
    Loader2
} from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [recentUsers, setRecentUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsRes, usersRes] = await Promise.all([
                    fetch('/api/admin/stats'),
                    fetch('/api/admin/users')
                ]);

                const statsData = await statsRes.json();
                const usersData = await usersRes.json();

                if (statsData.success) setStats(statsData.data);
                if (usersData.success) setRecentUsers(usersData.data.slice(0, 5)); // Take top 5
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-cisco-blue animate-spin" />
            </div>
        );
    }

    const ADMIN_STATS = [
        { label: 'Total Students', value: stats?.activeUsers || 0, change: 'Active', icon: Users, color: 'text-cisco-blue' },
        { label: 'Labs Created', value: stats?.totalLabs || 0, change: 'Total', icon: Terminal, color: 'text-emerald-500' },
        { label: 'Quizzes Taken', value: stats?.quizzesTaken || 0, change: 'Results', icon: Activity, color: 'text-orange-500' },
        { label: 'Platform Health', value: '99.9%', change: 'Stable', icon: Shield, color: 'text-violet-500' },
    ];

    return (
        <div className="space-y-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        System <span className="text-cisco-blue">Intelligence</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Platform overview and real-time performance metrics</p>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/dashboard/labs" className="btn-premium py-2.5 px-6 text-sm">
                        <Plus className="w-4 h-4 mr-2" /> New Resource
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {ADMIN_STATS.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card group border-white/40"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <span className="bg-slate-500/10 text-slate-500 text-[10px] font-black px-2 py-1 rounded-lg">
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</h3>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Real-time Analytics & Users */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Traffic Visualization (Mockup) */}
                <div className="lg:col-span-2 glass-card border-white/40 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">User Retention</h3>
                            <p className="text-xs text-slate-500">Weekly active user growth</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                            <div className="flex items-center gap-1.5 leading-none">
                                <div className="w-2.5 h-2.5 rounded-full bg-cisco-blue"></div> Target
                            </div>
                            <div className="flex items-center gap-1.5 leading-none px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-white/5">
                                Monthly View
                            </div>
                        </div>
                    </div>

                    {/* Abstract Chart Representation */}
                    <div className="h-64 flex items-end gap-3 px-2">
                        {[40, 65, 45, 80, 55, 90, 70, 40, 85, 60, 45, 95].map((h, i) => (
                            <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ duration: 1, delay: i * 0.05 }}
                                className={`flex-1 rounded-t-lg bg-gradient-to-t ${i === 11 ? 'from-cisco-blue to-cyan-400 shadow-[0_0_20px_rgba(4,159,217,0.3)]' : 'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700'
                                    }`}
                            />
                        ))}
                    </div>

                    <div className="mt-8 grid grid-cols-3 border-t border-slate-100 dark:border-white/5 pt-8">
                        <div className="text-center border-r border-slate-100 dark:border-white/5">
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.totalNodes || 0}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Nodes</p>
                        </div>
                        <div className="text-center border-r border-slate-100 dark:border-white/5">
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.publishedNodes || 0}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Published</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.avgScore || 0}%</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Quiz Score</p>
                        </div>
                    </div>
                </div>

                {/* Management List */}
                <div className="glass-card border-white/40">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Recent Students</h3>
                        <button className="text-cisco-blue hover:text-indigo-600 transition-colors">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {recentUsers.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No recent users found.</p>
                        ) : (
                            recentUsers.map((user, i) => (
                                <div key={user.id} className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 border border-slate-200 dark:border-white/5 uppercase">
                                        {(user.name || user.email).substring(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name || 'Unknown'}</p>
                                        <p className="text-[10px] font-bold text-slate-400 truncate tracking-wide uppercase">{user.email}</p>
                                    </div>
                                    <div className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter text-emerald-500 bg-emerald-500/10">
                                        Active
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <Link href="/dashboard/users" className="block w-full mt-10 py-3 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-center text-xs font-black text-slate-400 uppercase tracking-widest hover:border-cisco-blue hover:text-cisco-blue transition-all">
                        Manage All Users
                    </Link>
                </div>

            </div>

        </div>
        </div >
    );
}
