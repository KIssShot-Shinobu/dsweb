"use client";

interface Transaction {
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    user: { fullName: string } | null;
}

export function TreasuryCard({
    balance,
    recentTransactions,
    loading = false,
}: {
    balance: number;
    recentTransactions: Transaction[];
    loading?: boolean;
}) {

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1a1a1a]">
                <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/5">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Treasury</span>
                </div>
                <div className="p-5">
                    <div className="py-4 text-center">
                        <div className="mx-auto mb-3 h-3 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />
                        <div className="mx-auto h-9 w-44 animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1a1a1a]">
            <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/5">
                <span className="text-base font-semibold text-gray-900 dark:text-white">Treasury</span>
                <a href="/dashboard/treasury" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5">
                    View All
                </a>
            </div>
            <div className="p-5">
                <div className="mb-4 py-3 text-center">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
                        Current Balance
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(balance)}
                    </div>
                </div>

                {recentTransactions.length > 0 && (
                    <div>
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
                            Recent Transactions
                        </div>
                        <div className="space-y-2">
                            {recentTransactions.map((transaction) => (
                                <div key={transaction.id} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${transaction.amount >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                                        {transaction.amount >= 0 ? "↑" : "↓"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm text-gray-800 dark:text-white/80">{transaction.description}</div>
                                        <div className="text-xs text-gray-400 dark:text-white/30">
                                            {new Date(transaction.createdAt).toLocaleDateString("id-ID")}
                                        </div>
                                    </div>
                                    <div className={`flex-shrink-0 text-sm font-semibold ${transaction.amount >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                        {transaction.amount >= 0 ? "+" : ""}
                                        {formatCurrency(transaction.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {recentTransactions.length === 0 && (
                    <div className="py-6 text-center">
                        <div className="mb-2 text-3xl">💵</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">No transactions</div>
                    </div>
                )}
            </div>
        </div>
    );
}
