"use client";

import { DashboardEmptyState, DashboardPanel } from "@/components/dashboard/page-shell";

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

    return (
        <DashboardPanel
            title="Treasury"
            description="Ringkasan saldo kas guild dan transaksi paling baru."
            action={
                <a href="/dashboard/treasury" className="inline-flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70 dark:hover:bg-white/[0.06]">
                    View All
                </a>
            }
        >
            {loading ? (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-black/5 bg-slate-50/80 px-5 py-6 text-center dark:border-white/6 dark:bg-white/[0.03]">
                        <div className="mx-auto mb-3 h-3 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-white/8" />
                        <div className="mx-auto h-9 w-44 animate-pulse rounded-full bg-slate-200 dark:bg-white/8" />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-ds-amber/30 bg-ds-amber/[0.14] px-5 py-6 text-center dark:bg-ds-amber/10">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/55 dark:text-ds-amber/80">Current Balance</div>
                        <div className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{formatCurrency(balance)}</div>
                    </div>

                    {recentTransactions.length > 0 ? (
                        <div className="space-y-3">
                            {recentTransactions.map((transaction) => (
                                <div key={transaction.id} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50/80 p-3 transition-all hover:bg-white dark:border-white/6 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]">
                                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${transaction.amount >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                                        {transaction.amount >= 0 ? "+" : "-"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{transaction.description}</div>
                                        <div className="text-xs text-slate-400 dark:text-white/40">
                                            {new Date(transaction.createdAt).toLocaleDateString("id-ID")} · {transaction.user?.fullName || "Kas umum"}
                                        </div>
                                    </div>
                                    <div className={`flex-shrink-0 text-sm font-semibold ${transaction.amount >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                        {transaction.amount >= 0 ? "+" : "-"}
                                        {formatCurrency(Math.abs(transaction.amount))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <DashboardEmptyState
                            title="Belum ada transaksi"
                            description="Tambahkan transaksi pertama untuk melihat perubahan saldo kas guild di dashboard ini."
                            actionHref="/dashboard/treasury"
                            actionLabel="Tambah transaksi"
                        />
                    )}
                </div>
            )}
        </DashboardPanel>
    );
}
