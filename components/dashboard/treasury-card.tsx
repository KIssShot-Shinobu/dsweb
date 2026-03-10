"use client";

import Link from "next/link";
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
                <Link href="/dashboard/treasury" className="btn btn-outline btn-sm rounded-box">
                    View All
                </Link>
            }
        >
            {loading ? (
                <div className="space-y-4">
                    <div className="rounded-box border border-base-300 bg-base-200/40 px-5 py-6 text-center">
                        <div className="skeleton mx-auto mb-3 h-3 w-24 rounded-full" />
                        <div className="skeleton mx-auto h-9 w-44 rounded-full" />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-box border border-primary/30 bg-primary/10 px-5 py-6 text-center">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Current Balance</div>
                        <div className="mt-3 text-3xl font-black tracking-tight text-base-content">{formatCurrency(balance)}</div>
                    </div>

                    {recentTransactions.length > 0 ? (
                        <div className="space-y-3">
                            {recentTransactions.map((transaction) => (
                                <div key={transaction.id} className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3 transition-all hover:border-primary/20 hover:bg-base-100">
                                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${transaction.amount >= 0 ? "bg-success/12 text-success" : "bg-error/12 text-error"}`}>
                                        {transaction.amount >= 0 ? "+" : "-"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold text-base-content">{transaction.description}</div>
                                        <div className="text-xs text-base-content/50">
                                            {new Date(transaction.createdAt).toLocaleDateString("id-ID")} - {transaction.user?.fullName || "Kas umum"}
                                        </div>
                                    </div>
                                    <div className={`flex-shrink-0 text-sm font-semibold ${transaction.amount >= 0 ? "text-success" : "text-error"}`}>
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
