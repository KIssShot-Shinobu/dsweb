"use client";

import { useEffect, useState } from "react";

interface TreasuryData {
    balance: number;
    transactions: Transaction[];
}

interface Transaction {
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    member: { name: string } | null;
}

export function TreasuryCard() {
    const [data, setData] = useState<TreasuryData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/treasury")
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Treasury</span>
                </div>
                <div className="card-body">
                    <div className="treasury-balance">
                        <div className="skeleton" style={{ width: 100, height: 16, margin: "0 auto 8px" }} />
                        <div className="skeleton" style={{ width: 180, height: 40, margin: "0 auto" }} />
                    </div>
                </div>
            </div>
        );
    }

    const balance = data?.balance || 0;
    const recentTransactions = data?.transactions?.slice(0, 3) || [];

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Treasury</span>
                <a href="/dashboard/treasury" className="btn btn-outline" style={{ padding: "0.5rem 1rem", fontSize: "0.75rem" }}>
                    View All
                </a>
            </div>
            <div className="card-body">
                <div className="treasury-balance">
                    <div className="treasury-label">Current Balance</div>
                    <div className="treasury-amount">{formatCurrency(balance)}</div>
                </div>

                {recentTransactions.length > 0 && (
                    <div style={{ marginTop: "1.5rem" }}>
                        <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem", color: "var(--dashboard-text)" }}>
                            Recent Transactions
                        </div>
                        {recentTransactions.map((tx) => (
                            <div key={tx.id} className="transaction-item">
                                <div className={`transaction-icon ${tx.amount >= 0 ? "income" : "expense"}`}>
                                    {tx.amount >= 0 ? "↑" : "↓"}
                                </div>
                                <div className="transaction-info">
                                    <div className="transaction-desc">{tx.description}</div>
                                    <div className="transaction-date">
                                        {new Date(tx.createdAt).toLocaleDateString("id-ID")}
                                    </div>
                                </div>
                                <div className={`transaction-amount ${tx.amount >= 0 ? "income" : "expense"}`}>
                                    {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {recentTransactions.length === 0 && (
                    <div className="empty-state" style={{ padding: "1.5rem" }}>
                        <div className="empty-state-icon">💵</div>
                        <div className="empty-state-title">No transactions</div>
                    </div>
                )}
            </div>
        </div>
    );
}
