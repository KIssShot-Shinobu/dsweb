"use client";

import { useEffect, useState } from "react";

interface Transaction {
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    memberId: string | null;
    member: { name: string } | null;
}

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 transition-all";
const labelCls = "block text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-1.5";
const btnPrimary = "px-4 py-2 rounded-xl bg-ds-amber hover:bg-ds-gold text-black font-semibold text-sm transition-all disabled:opacity-50";
const btnOutline = "px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-all";
const btnDanger = "px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all";

export default function TreasuryPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ amount: 0, description: "", type: "income" });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchTreasury = () => {
        fetch("/api/treasury")
            .then((res) => res.json())
            .then((data) => { setTransactions(data.transactions || []); setBalance(data.balance || 0); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchTreasury(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const amount = formData.type === "expense" ? -Math.abs(Number(formData.amount)) : Math.abs(Number(formData.amount));
        try {
            const res = await fetch(editingId ? `/api/treasury/${editingId}` : "/api/treasury", {
                method: editingId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, description: formData.description }),
            });
            if (res.ok) { fetchTreasury(); resetForm(); }
        } catch (e) { console.error(e); }
        finally { setSubmitting(false); }
    };

    const handleEdit = (tx: Transaction) => {
        setFormData({ amount: Math.abs(tx.amount), description: tx.description, type: tx.amount >= 0 ? "income" : "expense" });
        setEditingId(tx.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this transaction?")) return;
        await fetch(`/api/treasury/${id}`, { method: "DELETE" });
        fetchTreasury();
    };

    const resetForm = () => { setFormData({ amount: 0, description: "", type: "income" }); setEditingId(null); setShowForm(false); };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const income = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expense = Math.abs(transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

    return (
        <>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Treasury</h1>
                    <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Manage guild finances</p>
                </div>
                <button className={btnPrimary} onClick={() => setShowForm(true)}>+ Add Transaction</button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="rounded-2xl p-5 bg-ds-amber border border-ds-amber">
                    <div className="text-xs font-semibold uppercase tracking-wider text-black/60 mb-2">Current Balance</div>
                    <div className="text-2xl font-bold text-black">{formatCurrency(balance)}</div>
                </div>
                <div className="rounded-2xl p-5 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Total Income</span>
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-sm font-bold">↑</div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-500">{formatCurrency(income)}</div>
                </div>
                <div className="rounded-2xl p-5 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Total Expense</span>
                        <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-sm font-bold">↓</div>
                    </div>
                    <div className="text-2xl font-bold text-red-500">{formatCurrency(expense)}</div>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 mb-5">
                    <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                            {editingId ? "Edit Transaction" : "Add New Transaction"}
                        </span>
                        <button className={btnOutline} onClick={resetForm}>Cancel</button>
                    </div>
                    <div className="p-5">
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className={labelCls}>Type</label>
                                    <select className={inputCls} value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                        <option value="income">Income (Pemasukan)</option>
                                        <option value="expense">Expense (Pengeluaran)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Amount (IDR) *</label>
                                    <input type="number" className={inputCls} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} required min="1" placeholder="10000" />
                                </div>
                                <div>
                                    <label className={labelCls}>Description *</label>
                                    <input type="text" className={inputCls} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required placeholder="e.g., Iuran bulanan" />
                                </div>
                            </div>
                            <button type="submit" className={btnPrimary} disabled={submitting}>
                                {submitting ? "Saving..." : editingId ? "Update Transaction" : "Add Transaction"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Transactions List */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">All Transactions ({transactions.length})</span>
                </div>
                <div className="p-5">
                    {loading ? (
                        <div className="text-sm text-gray-400 dark:text-white/40">Loading...</div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-3">💰</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No transactions yet</div>
                            <p className="text-xs text-gray-400">Add your first transaction</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {transactions.map((tx) => (
                                <div key={tx.id} className="flex items-center gap-4 p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${tx.amount >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                                        {tx.amount >= 0 ? "↑" : "↓"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{tx.description}</div>
                                        <div className="text-xs text-gray-400 dark:text-white/40">
                                            {formatDate(tx.createdAt)}{tx.member && ` · by ${tx.member.name}`}
                                        </div>
                                    </div>
                                    <div className={`text-sm font-bold flex-shrink-0 ${tx.amount >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                        {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button className={btnOutline} onClick={() => handleEdit(tx)}>Edit</button>
                                        <button className={btnDanger} onClick={() => handleDelete(tx.id)}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
