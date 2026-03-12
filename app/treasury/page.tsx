"use client";

import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { FormSelect } from "@/components/dashboard/form-select";

type Transaction = {
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    user: { fullName: string } | null;
};

const filterOptions = [
    { value: "ALL", label: "Semua" },
    { value: "MASUK", label: "Pemasukan" },
    { value: "KELUAR", label: "Pengeluaran" },
];

const PER_PAGE = 10;

export default function PublicTreasuryPage() {
    const currentYear = new Date().getFullYear();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(0);
    const [income, setIncome] = useState(0);
    const [expense, setExpense] = useState(0);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<"ALL" | "MASUK" | "KELUAR">("ALL");
    const [month, setMonth] = useState("ALL");
    const [year, setYear] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        setPage(1);
    }, [filter, month, year]);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams({
            month,
            year,
            page: String(page),
            limit: String(PER_PAGE),
        });
        if (filter !== "ALL") params.set("type", filter);

        fetch(`/api/treasury?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                setTransactions(data.transactions || []);
                setBalance(data.balance || 0);
                setIncome(data.income || 0);
                setExpense(data.expense || 0);
                setTotal(data.total || 0);
                setMessage(null);
            })
            .catch(() => {
                setTransactions([]);
                setBalance(0);
                setIncome(0);
                setExpense(0);
                setTotal(0);
                setMessage("Kas belum dapat ditampilkan saat ini.");
            })
            .finally(() => setLoading(false));
    }, [filter, month, page, year]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const monthOptions = [
        { value: "ALL", label: "Semua Bulan" },
        ...Array.from({ length: 12 }, (_, index) => {
            const value = index + 1;
            return {
                value: String(value),
                label: new Date(2000, value - 1).toLocaleString("id-ID", { month: "short" }),
            };
        }),
    ];

    const yearOptions = [
        { value: "ALL", label: "Semua Tahun" },
        ...[currentYear - 1, currentYear, currentYear + 1].map((value) => ({
            value: String(value),
            label: String(value),
        })),
    ];

    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto max-w-[1400px] px-4 pb-14 sm:px-6 lg:px-8">
                    <p className="mb-4 text-sm font-bold uppercase tracking-[0.34em] text-primary">Transparansi Treasury</p>
                    <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                        Kas komunitas terbuka agar setiap member tahu arus keuangan guild.
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-base-content/65 sm:text-base">
                        Data di sini bersifat read-only. Semua transaksi resmi dikelola oleh admin dari dashboard.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
                <div className="stats stats-vertical w-full border border-base-300 bg-base-100/80 shadow-sm sm:stats-horizontal">
                    <div className="stat">
                        <div className="stat-title">Saldo Bersih</div>
                        <div className="stat-value text-primary">{loading ? "..." : formatCurrency(balance)}</div>
                        <div className="stat-desc">Total saldo terkini</div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">Pemasukan</div>
                        <div className="stat-value text-success">{loading ? "..." : formatCurrency(income)}</div>
                        <div className="stat-desc">Total arus masuk</div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">Pengeluaran</div>
                        <div className="stat-value text-error">{loading ? "..." : formatCurrency(expense)}</div>
                        <div className="stat-desc">Total arus keluar</div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">Transaksi</div>
                        <div className="stat-value">{loading ? "..." : total}</div>
                        <div className="stat-desc">Total record</div>
                    </div>
                </div>

                <div className="mt-8 grid gap-3 sm:gap-4 md:grid-cols-[1fr_160px_140px]">
                    <FormSelect value={month} onChange={setMonth} options={monthOptions} />
                    <FormSelect value={year} onChange={setYear} options={yearOptions} />
                    <FormSelect value={filter} onChange={(value) => setFilter(value as "ALL" | "MASUK" | "KELUAR")} options={filterOptions} />
                </div>

                {message ? (
                    <div className="alert alert-error mt-6 rounded-box text-sm">
                        {message}
                    </div>
                ) : null}

                <div className="mt-6 space-y-3 sm:space-y-4">
                    {loading ? (
                        [1, 2, 3, 4, 5].map((item) => (
                            <div key={item} className="h-20 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                        ))
                    ) : transactions.length === 0 ? (
                        <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 p-6 text-xs text-base-content/65 sm:text-sm">
                            Belum ada transaksi untuk periode ini.
                        </div>
                    ) : (
                        transactions.map((transaction) => (
                            <div key={transaction.id} className="flex flex-col gap-3 rounded-box border border-base-300 bg-base-100/80 p-4 sm:flex-row sm:items-center">
                                <div className={`badge badge-lg ${transaction.amount >= 0 ? "badge-success" : "badge-error"} badge-outline`}>
                                    {transaction.amount >= 0 ? "MASUK" : "KELUAR"}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-semibold text-base-content sm:text-sm">{transaction.description}</div>
                                    <div className="truncate text-[11px] text-base-content/60 sm:text-xs">
                                        {formatDate(transaction.createdAt)} - {transaction.user?.fullName || "Kas umum"}
                                    </div>
                                </div>
                                <div className={`text-sm font-bold ${transaction.amount >= 0 ? "text-success" : "text-error"}`}>
                                    {transaction.amount >= 0 ? "+" : "-"}
                                    {formatCurrency(Math.abs(transaction.amount))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-base-content/60 sm:text-sm">
                        Menampilkan {transactions.length} dari {total} transaksi.
                    </div>
                    <div className="join">
                        <button
                            type="button"
                            className="btn btn-outline btn-sm join-item"
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page <= 1}
                        >
                            Prev
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm join-item pointer-events-none">
                            {page} / {totalPages}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm join-item"
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                            disabled={page >= totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
