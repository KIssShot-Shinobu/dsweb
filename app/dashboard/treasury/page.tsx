"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { UndoSnackbar } from "@/components/dashboard/undo-snackbar";
import { FormSelect } from "@/components/dashboard/form-select";
import { RowActions } from "@/components/dashboard/row-actions";
import { btnOutline, btnPrimary, dashboardStackCls, inputCls, labelCls } from "@/components/dashboard/form-styles";
import {
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import {
    TREASURY_CATEGORIES,
    TREASURY_CATEGORY_LABELS,
    TREASURY_METHOD_LABELS,
    TREASURY_METHODS,
    TREASURY_STATUS,
    TREASURY_STATUS_LABELS,
} from "@/lib/treasury-constants";

interface Transaction {
    id: string;
    amount: number;
    description: string;
    category: string;
    method: string;
    status: string;
    counterparty: string | null;
    referenceCode: string | null;
    createdAt: string;
    userId: string | null;
    user: { fullName: string; username?: string | null } | null;
}

interface UserOption {
    id: string;
    fullName: string;
    role: string;
}

type MonthlyTotal = {
    label: string;
    income: number;
    expense: number;
};

type CategoryBreakdown = Record<string, { income: number; expense: number }>;

const PER_PAGE = 10;
const UNDO_DURATION = 5000;

const transactionTypeOptions = [
    { value: "MASUK", label: "Pemasukan" },
    { value: "KELUAR", label: "Pengeluaran" },
];

const filterOptions = [
    { value: "ALL", label: "Semua" },
    { value: "MASUK", label: "Pemasukan" },
    { value: "KELUAR", label: "Pengeluaran" },
];

const categoryOptions = [
    { value: "ALL", label: "Semua Kategori" },
    ...TREASURY_CATEGORIES.map((value) => ({
        value,
        label: TREASURY_CATEGORY_LABELS[value],
    })),
];

const methodOptions = [
    { value: "ALL", label: "Semua Metode" },
    ...TREASURY_METHODS.map((value) => ({
        value,
        label: TREASURY_METHOD_LABELS[value],
    })),
];

const statusOptions = [
    { value: "ALL", label: "Semua Status" },
    ...TREASURY_STATUS.map((value) => ({
        value,
        label: TREASURY_STATUS_LABELS[value],
    })),
];

export default function TreasuryPage() {
    const currentYear = new Date().getFullYear();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(0);
    const [income, setIncome] = useState(0);
    const [expense, setExpense] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        amount: 0,
        description: "",
        type: "MASUK",
        category: "OTHER",
        method: "OTHER",
        status: "CLEARED",
        counterparty: "",
        referenceCode: "",
        userId: "NONE",
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<"ALL" | "MASUK" | "KELUAR">("ALL");
    const [month, setMonth] = useState("ALL");
    const [year, setYear] = useState("ALL");
    const [category, setCategory] = useState("ALL");
    const [method, setMethod] = useState("ALL");
    const [status, setStatus] = useState("ALL");
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<UserOption[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown>({});
    const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());

    const { success, error } = useToast();
    const [confirmState, setConfirmState] = useState<{ open: boolean; id: string; label: string }>({ open: false, id: "", label: "" });
    const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
    const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const userSelectOptions = useMemo(
        () => [
            { value: "NONE", label: "Kas umum / tanpa user" },
            ...users.map((user) => ({
                value: user.id,
                label: `${user.fullName} (${user.role})`,
            })),
        ],
        [users]
    );

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    const fetchTreasury = useCallback(() => {
        setLoading(true);
        const summaryYearValue = year !== "ALL" ? year : String(new Date().getFullYear());
        const params = new URLSearchParams({
            month,
            year,
            page: String(page),
            limit: String(PER_PAGE),
            includeSummary: "1",
            summaryYear: summaryYearValue,
        });
        if (filter !== "ALL") {
            params.set("type", filter);
        }
        if (category !== "ALL") {
            params.set("category", category);
        }
        if (method !== "ALL") {
            params.set("method", method);
        }
        if (status !== "ALL") {
            params.set("status", status);
        }
        if (search.trim()) {
            params.set("search", search.trim());
        }

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
            })
            .catch(() => {
                setTransactions([]);
                setBalance(0);
                setIncome(0);
                setExpense(0);
                setTotal(0);
                setMonthlyTotals([]);
                setCategoryBreakdown({});
            })
            .finally(() => setLoading(false));
    }, [category, filter, method, month, page, search, status, year]);

    const fetchUsers = useCallback(() => {
        setUsersLoading(true);
        fetch("/api/users?status=ACTIVE&role=ALL&perPage=100")
            .then((res) => res.json())
            .then((data) => {
                setUsers(data.data || []);
            })
            .catch(() => setUsers([]))
            .finally(() => setUsersLoading(false));
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchTreasury();
    }, [fetchTreasury]);

    useEffect(
        () => () => {
            if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        },
        []
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(editingId ? `/api/treasury/${editingId}` : "/api/treasury", {
                method: editingId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: formData.type,
                    amount: Math.abs(Number(formData.amount)),
                    description: formData.description,
                    category: formData.category,
                    method: formData.method,
                    status: formData.status,
                    counterparty: formData.counterparty || null,
                    referenceCode: formData.referenceCode || null,
                    userId: formData.userId === "NONE" ? null : formData.userId,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                fetchTreasury();
                resetForm();
                success(editingId ? "Transaksi berhasil diperbarui." : "Transaksi berhasil ditambahkan.");
            } else {
                error(data?.message || data?.error || "Gagal menyimpan transaksi.");
            }
        } catch {
            error("Kesalahan jaringan. Coba lagi.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (tx: Transaction) => {
        setFormData({
            amount: Math.abs(tx.amount),
            description: tx.description,
            type: tx.amount >= 0 ? "MASUK" : "KELUAR",
            category: tx.category || "OTHER",
            method: tx.method || "OTHER",
            status: tx.status || "CLEARED",
            counterparty: tx.counterparty || "",
            referenceCode: tx.referenceCode || "",
            userId: tx.userId || "NONE",
        });
        setEditingId(tx.id);
        setShowModal(true);
    };

    const executePermanentDelete = async (id: string) => {
        setPendingDelete(null);
        try {
            const res = await fetch(`/api/treasury/${id}`, { method: "DELETE" });
            if (!res.ok) {
                error("Gagal menghapus transaksi.");
            }
        } catch {
            error("Kesalahan jaringan saat menghapus transaksi.");
        } finally {
            fetchTreasury();
        }
    };

    const handleDeleteClick = (id: string, label: string) => {
        if (pendingDelete && deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            executePermanentDelete(pendingDelete.id);
        }
        setConfirmState({ open: true, id, label });
    };

    const handleConfirmDelete = () => {
        const { id, label } = confirmState;
        setConfirmState({ open: false, id: "", label: "" });
        setPendingDelete({ id, label });
        setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));

        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = setTimeout(() => executePermanentDelete(id), UNDO_DURATION);
    };

    const handleUndo = () => {
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        setPendingDelete(null);
        fetchTreasury();
        success("Penghapusan dibatalkan.");
    };

    const resetForm = () => {
        setFormData({
            amount: 0,
            description: "",
            type: "MASUK",
            category: "OTHER",
            method: "OTHER",
            status: "CLEARED",
            counterparty: "",
            referenceCode: "",
            userId: "NONE",
        });
        setEditingId(null);
        setShowModal(false);
    };

    const formatIdrInput = (value: number) => new Intl.NumberFormat("id-ID").format(value);
    const parseIdrInput = (value: string) => {
        const numeric = Number(value.replace(/[^0-9]/g, ""));
        return Number.isNaN(numeric) ? 0 : numeric;
    };

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
        <DashboardPageShell>
            <div className={dashboardStackCls}>
                <DashboardPageHeader
                    kicker="Finance Desk"
                    title="Treasury"
                    description="Kelola kas guild, hubungkan transaksi ke user aktif bila diperlukan, dan pantau arus masuk-keluar dengan default semua periode agar sinkron dengan data dashboard."
                    actions={<button className={btnPrimary} onClick={() => setShowModal(true)}>+ Tambah Transaksi</button>}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DashboardMetricCard label="Saldo Tersaring" value={loading ? "..." : formatCurrency(balance)} meta={month === "ALL" && year === "ALL" ? "Default menampilkan seluruh periode" : "Posisi saldo sesuai filter periode"} tone="accent" />
                    <DashboardMetricCard label="Pemasukan" value={loading ? "..." : formatCurrency(income)} meta="Total transaksi masuk" tone="success" />
                    <DashboardMetricCard label="Pengeluaran" value={loading ? "..." : formatCurrency(expense)} meta="Total transaksi keluar" tone="danger" />
                    <DashboardMetricCard label="Jumlah Transaksi" value={loading ? "..." : total} meta="Total record pada periode aktif" />
                </div>

                <DashboardPanel
                    title="Monthly Summary"
                    description={`Ringkasan arus kas tahun ${summaryYear}.`}
                >
                    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                        <AnalyticsChart data={monthlyTotals} loading={loading} title="Monthly Treasury" />
                        <div className="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-base-content">Category Breakdown</div>
                                <div className="text-xs text-base-content/50">Net</div>
                            </div>
                            <div className="mt-4 space-y-3">
                                {Object.keys(categoryBreakdown).length === 0 ? (
                                    <div className="text-xs text-base-content/45">Belum ada data kategori.</div>
                                ) : (
                                    Object.entries(categoryBreakdown)
                                        .sort((a, b) => (b[1].income - b[1].expense) - (a[1].income - a[1].expense))
                                        .map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between text-xs">
                                            <span className="text-base-content/70">
                                                {TREASURY_CATEGORY_LABELS[key as keyof typeof TREASURY_CATEGORY_LABELS] ?? key}
                                            </span>
                                            <span className="font-semibold text-base-content">
                                                {formatCurrency(value.income - value.expense)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel
                    title="Daftar Transaksi"
                    description={`Menampilkan ${total} transaksi pada periode yang dipilih.`}
                    action={(
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                            <input
                                type="text"
                                className="input input-bordered w-full sm:w-52"
                                placeholder="Cari deskripsi/ref"
                                value={search}
                                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                            />
                            <FormSelect value={month} onChange={(value) => { setMonth(value); setPage(1); }} options={monthOptions} className="w-full sm:w-32" />
                            <FormSelect value={year} onChange={(value) => { setYear(value); setPage(1); }} options={yearOptions} className="w-full sm:w-28" />
                            <FormSelect value={filter} onChange={(value) => { setFilter(value as "ALL" | "MASUK" | "KELUAR"); setPage(1); }} options={filterOptions} className="w-full sm:w-32" />
                            <FormSelect value={category} onChange={(value) => { setCategory(value); setPage(1); }} options={categoryOptions} className="w-full sm:w-40" />
                            <FormSelect value={method} onChange={(value) => { setMethod(value); setPage(1); }} options={methodOptions} className="w-full sm:w-36" />
                            <FormSelect value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={statusOptions} className="w-full sm:w-32" />
                            <a
                                className={`${btnOutline} btn-sm`}
                                href={`/api/treasury/export?month=${month}&year=${year}&type=${filter !== "ALL" ? filter : ""}&category=${category !== "ALL" ? category : ""}&method=${method !== "ALL" ? method : ""}&status=${status !== "ALL" ? status : ""}&search=${encodeURIComponent(search.trim())}`}
                            >
                                Export CSV
                            </a>
                            <button
                                className={`${btnOutline} btn-sm`}
                                onClick={() => {
                                    setMonth("ALL");
                                    setYear("ALL");
                                    setFilter("ALL");
                                    setCategory("ALL");
                                    setMethod("ALL");
                                    setStatus("ALL");
                                    setSearch("");
                                    setPage(1);
                                }}
                            >
                                Reset
                            </button>
                        </div>
                    )}
                >
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="h-20 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                            ))}
                        </div>
                    ) : transactions.length === 0 ? (
                        <DashboardEmptyState title="Belum ada transaksi" description="Tidak ada data untuk periode dan filter ini. Tambahkan transaksi baru atau ganti filter bulan." />
                    ) : (
                        <>
                            <div className="space-y-3">
                                {transactions.map((transaction) => (
                                    <div key={transaction.id} className="flex flex-col gap-3 rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-base-100 lg:flex-row lg:items-center">
                                        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${transaction.amount >= 0 ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                                            {transaction.amount >= 0 ? "+" : "-"}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="truncate text-sm font-semibold text-base-content">{transaction.description}</div>
                                                <span className="rounded-full border border-base-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-base-content/60">
                                                    {TREASURY_CATEGORY_LABELS[transaction.category as keyof typeof TREASURY_CATEGORY_LABELS] ?? transaction.category}
                                                </span>
                                                <span className={`badge badge-outline badge-xs ${transaction.status === "CLEARED" ? "badge-success" : transaction.status === "PENDING" ? "badge-warning" : "badge-ghost"}`}>
                                                    {TREASURY_STATUS_LABELS[transaction.status as keyof typeof TREASURY_STATUS_LABELS] ?? transaction.status}
                                                </span>
                                            </div>
                                            <div className="truncate text-xs text-base-content/45">
                                                {formatDate(transaction.createdAt)} - {transaction.user?.username || transaction.user?.fullName || "Kas umum"}
                                            </div>
                                            {transaction.counterparty || transaction.referenceCode ? (
                                                <div className="truncate text-[11px] text-base-content/40">
                                                    {transaction.counterparty ? `Counterparty: ${transaction.counterparty}` : "Counterparty: -"}
                                                    {" • "}
                                                    {transaction.referenceCode ? `Ref: ${transaction.referenceCode}` : "Ref: -"}
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className={`text-sm font-bold ${transaction.amount >= 0 ? "text-success" : "text-error"}`}>
                                            {transaction.amount >= 0 ? "+" : "-"}
                                            {formatCurrency(Math.abs(transaction.amount))}
                                        </div>
                                        <RowActions className="flex-shrink-0" onEdit={() => handleEdit(transaction)} onDelete={() => handleDeleteClick(transaction.id, transaction.description)} />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-5">
                                <Pagination page={page} totalPages={totalPages} total={total} perPage={PER_PAGE} onPage={setPage} />
                            </div>
                        </>
                    )}
                </DashboardPanel>
            </div>

            <Modal open={showModal} onClose={resetForm} title={editingId ? "Edit Transaksi" : "Tambah Transaksi Baru"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelCls}>Tipe Transaksi</label>
                        <FormSelect value={formData.type} onChange={(value) => setFormData((prev) => ({ ...prev, type: value }))} options={transactionTypeOptions} />
                    </div>
                    <div>
                        <label className={labelCls}>Kategori</label>
                        <FormSelect value={formData.category} onChange={(value) => setFormData((prev) => ({ ...prev, category: value }))} options={categoryOptions.filter((option) => option.value !== "ALL")} />
                    </div>
                    <div>
                        <label className={labelCls}>Metode Pembayaran</label>
                        <FormSelect value={formData.method} onChange={(value) => setFormData((prev) => ({ ...prev, method: value }))} options={methodOptions.filter((option) => option.value !== "ALL")} />
                    </div>
                    <div>
                        <label className={labelCls}>Status</label>
                        <FormSelect value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))} options={statusOptions.filter((option) => option.value !== "ALL")} />
                    </div>
                    <div>
                        <label className={labelCls}>Terkait User</label>
                        <FormSelect value={formData.userId} onChange={(value) => setFormData((prev) => ({ ...prev, userId: value }))} options={userSelectOptions} disabled={usersLoading} />
                    </div>
                    <div>
                        <label className={labelCls}>Nominal (IDR)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            className={inputCls}
                            value={formData.amount ? formatIdrInput(formData.amount) : ""}
                            onChange={(event) => setFormData((prev) => ({ ...prev, amount: parseIdrInput(event.target.value) }))}
                            required
                            placeholder="10000"
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Deskripsi</label>
                        <input type="text" className={inputCls} value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} required placeholder="Contoh: Iuran bulanan guild" />
                    </div>
                    <div>
                        <label className={labelCls}>Counterparty</label>
                        <input
                            type="text"
                            className={inputCls}
                            value={formData.counterparty}
                            onChange={(event) => setFormData((prev) => ({ ...prev, counterparty: event.target.value }))}
                            placeholder="Contoh: Sponsor ABC / Vendor XYZ"
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Reference Code</label>
                        <input
                            type="text"
                            className={inputCls}
                            value={formData.referenceCode}
                            onChange={(event) => setFormData((prev) => ({ ...prev, referenceCode: event.target.value }))}
                            placeholder="INV-2026-001"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" className={btnOutline} onClick={resetForm}>Batal</button>
                        <button type="submit" className={btnPrimary} disabled={submitting}>
                            {submitting ? "Menyimpan..." : editingId ? "Update" : "Tambah Transaksi"}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal open={confirmState.open} title="Hapus Transaksi" message={`Hapus "${confirmState.label}"? Anda punya 5 detik untuk undo.`} confirmLabel="Hapus" onConfirm={handleConfirmDelete} onCancel={() => setConfirmState({ open: false, id: "", label: "" })} />
            <UndoSnackbar open={!!pendingDelete} message={`"${pendingDelete?.label}" akan dihapus`} duration={UNDO_DURATION} onUndo={handleUndo} />
        </DashboardPageShell>
    );
}
