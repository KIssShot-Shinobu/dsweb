"use client";

import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { FormSelect } from "@/components/dashboard/form-select";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { TREASURY_CATEGORIES, TREASURY_CATEGORY_LABELS } from "@/lib/treasury-constants";

type Transaction = {
    id: string;
    amount: number;
    description: string;
    category: string;
    method: string;
    status: string;
    counterparty: string | null;
    referenceCode: string | null;
    createdAt: string;
    user: { fullName: string; username?: string | null } | null;
};

type MonthlyTotal = {
    label: string;
    income: number;
    expense: number;
};

type CategoryBreakdown = Record<string, { income: number; expense: number }>;

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
    const [category, setCategory] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown>({});
    const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());

    useEffect(() => {
        setPage(1);
    }, [filter, month, year, category]);

    useEffect(() => {
        setLoading(true);
        const summaryYearValue = year !== "ALL" ? year : String(new Date().getFullYear());
        const params = new URLSearchParams({
            month,
            year,
            page: String(page),
            limit: String(PER_PAGE),
            includeSummary: "1",
            public: "1",
            summaryYear: summaryYearValue,
        });
        if (filter !== "ALL") params.set("type", filter);
        if (category !== "ALL") params.set("category", category);

        fetch(`/api/treasury?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                setTransactions(data.transactions || []);
                setBalance(data.balance || 0);
                setIncome(data.income || 0);
                setExpense(data.expense || 0);
                setTotal(data.total || 0);
                setMonthlyTotals(data.monthlyTotals || []);
                setCategoryBreakdown(data.categoryBreakdown || {});
                setSummaryYear(data.summaryYear || new Date().getFullYear());
                setMessage(null);
            })
            .catch(() => {
                setTransactions([]);
                setBalance(0);
                setIncome(0);
                setExpense(0);
                setTotal(0);
                setMonthlyTotals([]);
                setCategoryBreakdown({});
                setMessage("Kas belum dapat ditampilkan saat ini.");
            })
            .finally(() => setLoading(false));
    }, [filter, month, page, year, category]);

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

    const categoryOptions = [
        { value: "ALL", label: "Semua Kategori" },
        ...TREASURY_CATEGORIES.map((value) => ({
            value,
            label: TREASURY_CATEGORY_LABELS[value],
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-box border border-base-300 bg-base-100/80 p-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-base-content/45">Saldo Bersih</div>
                        <div className="mt-3 text-2xl font-black text-primary">{loading ? "..." : formatCurrency(balance)}</div>
                        <div className="text-xs text-base-content/50">Total saldo terkini</div>
                    </div>
                    <div className="rounded-box border border-base-300 bg-base-100/80 p-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-base-content/45">Pemasukan</div>
                        <div className="mt-3 text-2xl font-black text-success">{loading ? "..." : formatCurrency(income)}</div>
                        <div className="text-xs text-base-content/50">Arus masuk periode aktif</div>
                    </div>
                    <div className="rounded-box border border-base-300 bg-base-100/80 p-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-base-content/45">Pengeluaran</div>
                        <div className="mt-3 text-2xl font-black text-error">{loading ? "..." : formatCurrency(expense)}</div>
                        <div className="text-xs text-base-content/50">Arus keluar periode aktif</div>
                    </div>
                    <div className="rounded-box border border-base-300 bg-base-100/80 p-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-base-content/45">Net Flow</div>
                        <div className="mt-3 text-2xl font-black text-base-content">{loading ? "..." : formatCurrency(income - expense)}</div>
                        <div className="text-xs text-base-content/50">Pemasukan minus pengeluaran</div>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
                    <AnalyticsChart data={monthlyTotals} loading={loading} title="Monthly Treasury" />
                    <div className="rounded-box border border-base-300 bg-base-100/80 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-base-content">Category Breakdown</div>
                                <div className="text-xs text-base-content/55">Tahun {summaryYear}</div>
                            </div>
                        </div>
                        <div className="mt-4 space-y-3">
                            {Object.keys(categoryBreakdown).length === 0 ? (
                                <div className="text-xs text-base-content/50">Belum ada data kategori.</div>
                            ) : (
                                Object.entries(categoryBreakdown)
                                    .sort((a, b) => (b[1].income - b[1].expense) - (a[1].income - a[1].expense))
                                    .map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between text-xs">
                                        <span className="text-base-content/70">{TREASURY_CATEGORY_LABELS[key as keyof typeof TREASURY_CATEGORY_LABELS] ?? key}</span>
                                        <span className="font-semibold text-base-content">
                                            {formatCurrency(value.income - value.expense)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid gap-3 sm:gap-4 lg:grid-cols-[1.1fr_1fr_1fr_1fr_auto]">
                    <FormSelect value={month} onChange={setMonth} options={monthOptions} />
                    <FormSelect value={year} onChange={setYear} options={yearOptions} />
                    <FormSelect value={filter} onChange={(value) => setFilter(value as "ALL" | "MASUK" | "KELUAR")} options={filterOptions} />
                    <FormSelect value={category} onChange={setCategory} options={categoryOptions} />
                    <a
                        className="btn btn-outline"
                        href={`/api/treasury/export?public=1&month=${month}&year=${year}&type=${filter !== "ALL" ? filter : ""}&category=${category !== "ALL" ? category : ""}`}
                    >
                        Download CSV
                    </a>
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
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="truncate text-xs font-semibold text-base-content sm:text-sm">{transaction.description}</div>
                                        <span className="rounded-full border border-base-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-base-content/55">
                                            {TREASURY_CATEGORY_LABELS[transaction.category as keyof typeof TREASURY_CATEGORY_LABELS] ?? transaction.category}
                                        </span>
                                    </div>
                                    <div className="truncate text-[11px] text-base-content/60 sm:text-xs">
                                        {formatDate(transaction.createdAt)} - {transaction.user?.username || transaction.user?.fullName || "Kas umum"}
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
