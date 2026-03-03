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

export default function TreasuryPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        amount: 0,
        description: "",
        type: "income",
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchTreasury = () => {
        fetch("/api/treasury")
            .then((res) => res.json())
            .then((data) => {
                setTransactions(data.transactions || []);
                setBalance(data.balance || 0);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchTreasury();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const amount = formData.type === "expense"
            ? -Math.abs(Number(formData.amount))
            : Math.abs(Number(formData.amount));

        const url = editingId ? `/api/treasury/${editingId}` : "/api/treasury";
        const method = editingId ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount,
                    description: formData.description,
                }),
            });

            if (res.ok) {
                fetchTreasury();
                resetForm();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (tx: Transaction) => {
        setFormData({
            amount: Math.abs(tx.amount),
            description: tx.description,
            type: tx.amount >= 0 ? "income" : "expense",
        });
        setEditingId(tx.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this transaction?")) return;

        try {
            await fetch(`/api/treasury/${id}`, { method: "DELETE" });
            fetchTreasury();
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setFormData({ amount: 0, description: "", type: "income" });
        setEditingId(null);
        setShowForm(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const income = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expense = Math.abs(transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Treasury</h1>
                    <p className="page-subtitle">Manage guild finances</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    + Add Transaction
                </button>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="stat-card primary">
                    <div className="stat-label">Current Balance</div>
                    <div className="stat-value">{formatCurrency(balance)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">Total Income</span>
                        <div className="stat-icon" style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}>↑</div>
                    </div>
                    <div className="stat-value" style={{ color: "#22c55e" }}>{formatCurrency(income)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">Total Expense</span>
                        <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>↓</div>
                    </div>
                    <div className="stat-value" style={{ color: "#ef4444" }}>{formatCurrency(expense)}</div>
                </div>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <div className="card-header">
                        <span className="card-title">
                            {editingId ? "Edit Transaction" : "Add New Transaction"}
                        </span>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={resetForm}
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid-3">
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select
                                        className="form-select"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="income">Income (Pemasukan)</option>
                                        <option value="expense">Expense (Pengeluaran)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount (IDR) *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                        required
                                        min="1"
                                        placeholder="10000"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                        placeholder="e.g., Iuran bulanan, Hadiah tournament"
                                    />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting}
                                >
                                    {submitting ? "Saving..." : editingId ? "Update Transaction" : "Add Transaction"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <span className="card-title">All Transactions ({transactions.length})</span>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div>Loading...</div>
                    ) : transactions.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">💰</div>
                            <div className="empty-state-title">No transactions yet</div>
                            <p>Add your first transaction</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: "0.5rem" }}>
                            {transactions.map((tx) => (
                                <div key={tx.id} className="list-item">
                                    <div
                                        className={`transaction-icon ${tx.amount >= 0 ? "income" : "expense"}`}
                                        style={{ width: 42, height: 42, fontSize: "1.25rem" }}
                                    >
                                        {tx.amount >= 0 ? "↑" : "↓"}
                                    </div>
                                    <div className="list-item-info">
                                        <div className="list-item-title">{tx.description}</div>
                                        <div className="list-item-subtitle">
                                            {formatDate(tx.createdAt)}
                                            {tx.member && ` • by ${tx.member.name}`}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            fontSize: "1rem",
                                            color: tx.amount >= 0 ? "#22c55e" : "#ef4444",
                                        }}
                                    >
                                        {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                                    </div>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => handleEdit(tx)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDelete(tx.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
