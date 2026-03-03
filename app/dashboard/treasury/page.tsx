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
                        <div className="stat-icon" style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--dashboard-success)" }}>↑</div>
                    </div>
                    <div className="stat-value" style={{ color: "var(--dashboard-success)" }}>{formatCurrency(income)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">Total Expense</span>
                        <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--dashboard-error)" }}>↓</div>
                    </div>
                    <div className="stat-value" style={{ color: "var(--dashboard-error)" }}>{formatCurrency(expense)}</div>
                </div>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <div className="card-header">
                        <span className="card-title">
                            {editingId ? "Edit Transaction" : "Add New Transaction"}
                        </span>
                        <button
                            className="btn btn-outline"
                            onClick={resetForm}
                            style={{ padding: "0.5rem 1rem" }}
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Type
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                            background: "white",
                                        }}
                                    >
                                        <option value="income">Income (Pemasukan)</option>
                                        <option value="expense">Expense (Pengeluaran)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Amount (IDR) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                        required
                                        min="1"
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                        }}
                                        placeholder="10000"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--dashboard-text)" }}>
                                        Description *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "10px",
                                            border: "1px solid var(--dashboard-border)",
                                            fontSize: "0.875rem",
                                        }}
                                        placeholder="e.g., Iuran bulanan, Hadiah tournament"
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: "1.5rem" }}>
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
                                <div
                                    key={tx.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "1rem",
                                        padding: "1rem",
                                        background: "var(--dashboard-bg)",
                                        borderRadius: "10px",
                                    }}
                                >
                                    <div
                                        className={`transaction-icon ${tx.amount >= 0 ? "income" : "expense"}`}
                                        style={{ width: 42, height: 42, fontSize: "1.25rem" }}
                                    >
                                        {tx.amount >= 0 ? "↑" : "↓"}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: "var(--dashboard-text)", marginBottom: 4 }}>
                                            {tx.description}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--dashboard-text-muted)" }}>
                                            {formatDate(tx.createdAt)}
                                            {tx.member && ` • by ${tx.member.name}`}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            fontSize: "1rem",
                                            color: tx.amount >= 0 ? "var(--dashboard-success)" : "var(--dashboard-error)",
                                        }}
                                    >
                                        {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                                    </div>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => handleEdit(tx)}
                                        style={{ padding: "0.5rem 0.75rem" }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => handleDelete(tx.id)}
                                        style={{ padding: "0.5rem 0.75rem", color: "var(--dashboard-error)" }}
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
