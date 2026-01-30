'use client';

import { useState, useEffect } from 'react';

interface KnowledgeNode {
    id: string;
    topic: string;
    subtopic: string | null;
    intent: string;
    status: string;
    difficulty: string;
    generatedBy: string;
    estimatedMinutes: number;
    updatedAt: string;
}

const emptyNode = {
    topic: '',
    subtopic: '',
    intent: '',
    difficulty: 'intermediate',
    coreExplanation: '',
    mentalModel: '',
    wireLogic: '',
    cliExample: '',
    examNote: '',
    estimatedMinutes: 10,
    publishImmediately: true,
};

export default function KnowledgePage() {
    const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', topic: '', search: '' });

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newNode, setNewNode] = useState(emptyNode);
    const [saving, setSaving] = useState(false);
    const [editingNode, setEditingNode] = useState<string | null>(null);
    const [statusModal, setStatusModal] = useState<{ id: string; current: string } | null>(null);

    const fetchNodes = async () => {
        try {
            const response = await fetch('/api/admin/knowledge');
            const data = await response.json();
            if (data.success) {
                setNodes(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch nodes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNodes();
    }, []);

    const handleAddNode = async (publishNow: boolean = false) => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/knowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newNode,
                    publishImmediately: publishNow,
                }),
            });

            if (res.ok) {
                setShowAddModal(false);
                setNewNode(emptyNode);
                fetchNodes();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to add node');
            }
        } catch (error) {
            console.error('Add failed:', error);
            alert('An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const res = await fetch('/api/admin/knowledge', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus }),
            });

            if (res.ok) {
                setStatusModal(null);
                fetchNodes();
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Status update failed:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this node?')) return;

        try {
            const res = await fetch(`/api/admin/knowledge?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchNodes();
            } else {
                alert('Failed to delete node');
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const statusColors: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        approved: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        archived: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    const filteredNodes = nodes.filter(node => {
        if (filter.status && node.status !== filter.status) return false;
        if (filter.topic && node.topic !== filter.topic) return false;
        if (filter.search && !node.intent.toLowerCase().includes(filter.search.toLowerCase())) return false;
        return true;
    });

    const topics = [...new Set(nodes.map(n => n.topic))];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Knowledge Management</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage and review knowledge nodes
                    </p>
                </div>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Node</button>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Search by intent..."
                            className="input w-full"
                            value={filter.search}
                            onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
                        />
                    </div>
                    <select
                        className="input w-40"
                        value={filter.status}
                        onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}
                    >
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="approved">Approved</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                    <select
                        className="input w-40"
                        value={filter.topic}
                        onChange={(e) => setFilter(f => ({ ...f, topic: e.target.value }))}
                    >
                        <option value="">All Topics</option>
                        {topics.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Intent</th>
                                <th className="px-4 py-3 text-left font-medium">Topic</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                <th className="px-4 py-3 text-left font-medium">Difficulty</th>
                                <th className="px-4 py-3 text-left font-medium">Source</th>
                                <th className="px-4 py-3 text-left font-medium">Updated</th>
                                <th className="px-4 py-3 text-left font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={7} className="px-4 py-4">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredNodes.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        No knowledge nodes found
                                    </td>
                                </tr>
                            ) : (
                                filteredNodes.map((node) => (
                                    <tr key={node.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 max-w-xs truncate">{node.intent}</td>
                                        <td className="px-4 py-3">
                                            <span className="badge-secondary">{node.topic}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setStatusModal({ id: node.id, current: node.status })}
                                                className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:ring-2 ring-offset-1 ${statusColors[node.status] || ''}`}
                                            >
                                                {node.status}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 capitalize">{node.difficulty}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs uppercase">{node.generatedBy}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {new Date(node.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDelete(node.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Node Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <h2 className="text-xl font-bold mb-4">Add New Knowledge Node</h2>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Topic *</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="e.g., OSPF, VLAN, STP"
                                    value={newNode.topic}
                                    onChange={(e) => setNewNode(n => ({ ...n, topic: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Subtopic</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Optional subtopic"
                                    value={newNode.subtopic}
                                    onChange={(e) => setNewNode(n => ({ ...n, subtopic: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Intent (Question) *</label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="What question does this answer?"
                                value={newNode.intent}
                                onChange={(e) => setNewNode(n => ({ ...n, intent: e.target.value }))}
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Difficulty *</label>
                                <select
                                    className="input w-full"
                                    value={newNode.difficulty}
                                    onChange={(e) => setNewNode(n => ({ ...n, difficulty: e.target.value }))}
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Est. Minutes</label>
                                <input
                                    type="number"
                                    className="input w-full"
                                    value={newNode.estimatedMinutes}
                                    onChange={(e) => setNewNode(n => ({ ...n, estimatedMinutes: parseInt(e.target.value) || 10 }))}
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Core Explanation *</label>
                            <textarea
                                className="input w-full h-24"
                                placeholder="Main explanation content..."
                                value={newNode.coreExplanation}
                                onChange={(e) => setNewNode(n => ({ ...n, coreExplanation: e.target.value }))}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Mental Model *</label>
                            <textarea
                                className="input w-full h-20"
                                placeholder="Easy-to-remember mental model..."
                                value={newNode.mentalModel}
                                onChange={(e) => setNewNode(n => ({ ...n, mentalModel: e.target.value }))}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Wire Logic *</label>
                            <textarea
                                className="input w-full h-20"
                                placeholder="How it works at packet level..."
                                value={newNode.wireLogic}
                                onChange={(e) => setNewNode(n => ({ ...n, wireLogic: e.target.value }))}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">CLI Example</label>
                            <textarea
                                className="input w-full h-20 font-mono text-sm"
                                placeholder="Router(config)# ..."
                                value={newNode.cliExample}
                                onChange={(e) => setNewNode(n => ({ ...n, cliExample: e.target.value }))}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Exam Note</label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="Quick tip for the exam..."
                                value={newNode.examNote}
                                onChange={(e) => setNewNode(n => ({ ...n, examNote: e.target.value }))}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                            <button className="btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button
                                className="btn-outline"
                                onClick={() => handleAddNode(false)}
                                disabled={saving}
                            >
                                Save as Draft
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => handleAddNode(true)}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : '✓ Publish Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Change Modal */}
            {statusModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80">
                        <h3 className="font-bold mb-4">Change Status</h3>
                        <div className="space-y-2">
                            {['draft', 'approved', 'published', 'archived'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusChange(statusModal.id, status)}
                                    className={`w-full p-2 rounded text-left capitalize ${statusModal.current === status
                                        ? 'bg-cisco-blue text-white'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                        <button
                            className="btn-outline w-full mt-4"
                            onClick={() => setStatusModal(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
