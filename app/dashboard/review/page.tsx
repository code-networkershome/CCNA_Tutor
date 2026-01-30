'use client';

import { useState, useEffect } from 'react';

interface ReviewItem {
    id: string;
    type: 'knowledge' | 'lab' | 'question';
    title: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    submittedBy: string;
}

export default function ReviewQueuePage() {
    const [items, setItems] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchItems = async () => {
        try {
            const res = await fetch('/api/admin/review');
            const data = await res.json();
            if (data.success) {
                setItems(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch review items:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleAction = async (item: ReviewItem, action: 'approve' | 'reject') => {
        setProcessing(item.id);
        try {
            const res = await fetch('/api/admin/review', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: item.id,
                    type: item.type,
                    action,
                }),
            });
            const data = await res.json();
            if (data.success) {
                fetchItems();
            } else {
                alert(data.error || 'Failed to update');
            }
        } catch (error) {
            alert('Failed to process');
        } finally {
            setProcessing(null);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'knowledge': return '📚';
            case 'lab': return '💻';
            case 'question': return '❓';
            default: return '📄';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'knowledge': return 'Knowledge Node';
            case 'lab': return 'Lab Exercise';
            case 'question': return 'Quiz Question';
            default: return type;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Review Queue</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Review and approve AI-generated content before publishing
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card p-4 text-center">
                    <div className="text-2xl font-bold">{items.length}</div>
                    <div className="text-sm text-gray-500">Pending Review</div>
                </div>
                <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                        {items.filter(i => i.type === 'knowledge').length}
                    </div>
                    <div className="text-sm text-gray-500">Knowledge Nodes</div>
                </div>
                <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                        {items.filter(i => i.type === 'lab').length}
                    </div>
                    <div className="text-sm text-gray-500">Labs</div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-cisco-blue border-t-transparent rounded-full" />
                </div>
            ) : items.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="text-5xl mb-4">✅</div>
                    <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
                    <p className="text-gray-500">No items pending review</p>
                </div>
            ) : (
                <div className="card">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="text-left p-4">Item</th>
                                <th className="text-left p-4">Type</th>
                                <th className="text-left p-4">Submitted</th>
                                <th className="text-left p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} className="border-b dark:border-gray-700">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{getTypeIcon(item.type)}</span>
                                            <div>
                                                <div className="font-medium">{item.title}</div>
                                                <div className="text-sm text-gray-500">by {item.submittedBy}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="badge badge-secondary">{getTypeLabel(item.type)}</span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(item.submittedAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAction(item, 'approve')}
                                                disabled={processing === item.id}
                                                className="btn-primary btn-sm"
                                            >
                                                {processing === item.id ? '...' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => handleAction(item, 'reject')}
                                                disabled={processing === item.id}
                                                className="btn-outline btn-sm text-red-600"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
