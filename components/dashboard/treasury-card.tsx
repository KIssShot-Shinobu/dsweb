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

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency", currency: "IDR", minimumFractionDigits: 0,
        }).format(amount);

    if (loading) {
        return (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Treasury</span>
                </div>
                <div className="p-5">
                    <div className="text-center py-4">
                        <div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full w-24 mx-auto mb-3 animate-pulse" />
                        <div className="h-9 bg-gray-100 dark:bg-white/5 rounded-full w-44 mx-auto animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    const balance = data?.balance || 0;
    const recentTransactions = data?.transactions?.slice(0, 3) || [];

    return (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                <span className="text-base font-semibold text-gray-900 dark:text-white">Treasury</span>
                <a href="/dashboard/treasury" className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                    View All
                </a>
            </div>
            <div className="p-5">
                {/* Balance */}
                <div className="text-center py-3 mb-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30 mb-2">
                        Current Balance
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(balance)}
                    </div>
                </div>

                {/* Recent Transactions */}
                {recentTransactions.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider mb-3">
                            Recent Transactions
                        </div>
                        <div className="space-y-2">
                            {recentTransactions.map((tx) => (
                                <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${tx.amount >= 0
                                            ? "bg-emerald-500/10 text-emerald-500"
                                            : "bg-red-500/10 text-red-500"
                                        }`}>
                                        {tx.amount >= 0 ? "↑" : "↓"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-gray-800 dark:text-white/80 truncate">{tx.description}</div>
                                        <div className="text-xs text-gray-400 dark:text-white/30">
                                            {new Date(tx.createdAt).toLocaleDateString("id-ID")}
                                        </div>
                                    </div>
                                    <div className={`text-sm font-semibold flex-shrink-0 ${tx.amount >= 0 ? "text-emerald-500" : "text-red-500"
                                        }`}>
                                        {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {recentTransactions.length === 0 && (
                    <div className="text-center py-6">
                        <div className="text-3xl mb-2">💵</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">No transactions</div>
                    </div>
                )}
            </div>
        </div>
    );
}
