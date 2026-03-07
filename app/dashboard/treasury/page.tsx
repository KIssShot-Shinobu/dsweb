"use client";

import { useEffect, useRef, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { UndoSnackbar } from "@/components/dashboard/undo-snackbar";
import { FormSelect } from "@/components/dashboard/form-select";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { RowActions } from "@/components/dashboard/row-actions";

interface Transaction {
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    userId: string | null;
    user: { fullName: string } | null;
}

const PER_PAGE = 10;
const UNDO_DURATION = 5000;

const transactionTypeOptions = [
    { value: "MASUK", label: "Pemasukan (Income)" },
    { value: "KELUAR", label: "Pengeluaran (Expense)" },
];

export default function TreasuryPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ amount: 0, description: "", type: "MASUK" });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const [month, setMonth] = useState(currentMonth);
    const [year, setYear] = useState(currentYear);

    const { success, error } = useToast();
    const [confirmState, setConfirmState] = useState<{ open: boolean; id: string; label: string }>({ open: false, id: "", label: "" });
    const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string; item: Transaction } | null>(null);
    const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchTreasury = () => {
        setLoading(true);
        fetch(`/api/treasury?month=${month}&year=${year}`)
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
    }, [month, year]);

    useEffect(() => () => {
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(editingId ? `/api/treasury/${editingId}` : "/api/treasury", {
                method: editingId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: formData.type.toUpperCase(),
                    amount: Math.abs(Number(formData.amount)),
                    description: formData.description,
                }),
            });
            if (res.ok) {
                fetchTreasury();
                resetForm();
                success(editingId ? "Transaksi berhasil diperbarui." : "Transaksi berhasil ditambahkan.");
            } else {
                error("Gagal menyimpan transaksi.");
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
        });
        setEditingId(tx.id);
        setShowModal(true);
    };

    const handleDeleteClick = (id: string, label: string) => {
        if (pendingDelete && deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            executePermanentDelete(pendingDelete.id);
        }
        setConfirmState({ open: true, id, label });
    };

    const executePermanentDelete = async (id: string) => {
        setPendingDelete(null);
        try {
            const res = await fetch(`/api/treasury/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchTreasury();
            } else {
                fetchTreasury();
                error("Gagal menghapus transaksi.");
            }
        } catch {
            fetchTreasury();
            error("Kesalahan jaringan. Transaksi dipulihkan.");
        }
    };

    const handleConfirmDelete = () => {
        const { id, label } = confirmState;
        const item = transactions.find((transaction) => transaction.id === id);
        if (!item) return;
        setConfirmState({ open: false, id: "", label: "" });

        setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
        setBalance((prev) => prev - item.amount);
        setPendingDelete({ id, label, item });

        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = setTimeout(() => executePermanentDelete(id), UNDO_DURATION);
    };

    const handleUndo = () => {
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        if (pendingDelete) {
            setTransactions((prev) =>
                [pendingDelete.item, ...prev].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
            );
            setBalance((prev) => prev + pendingDelete.item.amount);
            success(`"${pendingDelete.label}" dipulihkan.`);
        }
        setPendingDelete(null);
    };

    const resetForm = () => {
        setFormData({ amount: 0, description: "", type: "MASUK" });
        setEditingId(null);
        setShowModal(false);
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

    const income = transactions.filter((transaction) => transaction.amount > 0).reduce((sum, transaction) => sum + transaction.amount, 0);
    const expense = Math.abs(transactions.filter((transaction) => transaction.amount < 0).reduce((sum, transaction) => sum + transaction.amount, 0));

    const filtered = transactions.filter((transaction) => {
        if (filter === "income") return transaction.amount >= 0;
        if (filter === "expense") return transaction.amount < 0;
        return true;
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const handleFilter = (nextFilter: typeof filter) => {
        setFilter(nextFilter);
        setPage(1);
    };

    const filterBtn = (value: typeof filter) =>
        `px-3 py-1 rounded-lg text-xs font-medium transition-all ${filter === value ? "bg-ds-amber text-black" : "text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5"}`;

    const monthOptions = Array.from({ length: 12 }, (_, index) => {
        const value = index + 1;
        return {
            value: String(value),
            label: new Date(2000, value - 1).toLocaleString("id-ID", { month: "short" }),
        };
    });

    const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map((value) => ({
        value: String(value),
        label: String(value),
    }));

    return (
        <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">Treasury</h1>
                    <p className="mt-0.5 text-sm text-gray-400 dark:text-white/40">Kelola kas guild dan riwayat transaksi</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-[#161616]">
                        <div className="w-24">
                            <FormSelect value={String(month)} onChange={(value) => setMonth(Number(value))} options={monthOptions} />
                        </div>
                        <div className="ml-1 w-24 border-l border-gray-200 pl-1 dark:border-white/10">
                            <FormSelect value={String(year)} onChange={(value) => setYear(Number(value))} options={yearOptions} />
                        </div>
                    </div>
                    <button className={btnPrimary} onClick={() => setShowModal(true)}>
                        + Tambah Transaksi
                    </button>
                </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
                <div className="rounded-2xl border border-ds-amber bg-ds-amber p-5">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/60">Current Balance</div>
                    <div className="text-2xl font-bold text-black">{formatCurrency(balance)}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/5 dark:bg-[#1a1a1a]">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Total Income</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-500">↑</div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-500">{formatCurrency(income)}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/5 dark:bg-[#1a1a1a]">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Total Expense</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/10 text-sm font-bold text-red-500">↓</div>
                    </div>
                    <div className="text-2xl font-bold text-red-500">{formatCurrency(expense)}</div>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1a1a1a]">
                <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between md:p-5">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Daftar Transaksi ({filtered.length})</span>
                    <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 dark:bg-white/5">
                        <button className={filterBtn("all")} onClick={() => handleFilter("all")}>Semua</button>
                        <button className={filterBtn("income")} onClick={() => handleFilter("income")}>↑ Pemasukan</button>
                        <button className={filterBtn("expense")} onClick={() => handleFilter("expense")}>↓ Pengeluaran</button>
                    </div>
                </div>
                <div className="p-4 md:p-5">
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="h-14 rounded-xl bg-gray-100 animate-pulse dark:bg-white/5" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="mb-3 text-4xl">💰</div>
                            <div className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Belum ada transaksi</div>
                            <p className="text-xs text-gray-400">Tidak ada data transaksi untuk filter ini</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {paginated.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] md:p-3.5">
                                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${transaction.amount >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                                            {transaction.amount >= 0 ? "↑" : "↓"}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{transaction.description}</div>
                                            <div className="truncate text-xs text-gray-400 dark:text-white/40">
                                                {formatDate(transaction.createdAt)}
                                                {transaction.user && ` · by ${transaction.user.fullName}`}
                                            </div>
                                        </div>
                                        <div className={`flex-shrink-0 text-sm font-bold ${transaction.amount >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                            {transaction.amount >= 0 ? "+" : ""}
                                            {formatCurrency(transaction.amount)}
                                        </div>
                                        <RowActions
                                            className="flex-shrink-0"
                                            onEdit={() => handleEdit(transaction)}
                                            onDelete={() => handleDeleteClick(transaction.id, transaction.description)}
                                        />
                                    </div>
                                ))}
                            </div>
                            <Pagination page={page} totalPages={totalPages} total={filtered.length} perPage={PER_PAGE} onPage={setPage} />
                        </>
                    )}
                </div>
            </div>

            <Modal open={showModal} onClose={resetForm} title={editingId ? "Edit Transaksi" : "Tambah Transaksi Baru"}>
                <form onSubmit={handleSubmit}>
                    <div className="mb-5 grid grid-cols-1 gap-4">
                        <div>
                            <label className={labelCls}>Type</label>
                            <FormSelect value={formData.type} onChange={(value) => setFormData({ ...formData, type: value })} options={transactionTypeOptions} />
                        </div>
                        <div>
                            <label className={labelCls}>Nominal (IDR) *</label>
                            <input
                                type="number"
                                className={inputCls}
                                value={formData.amount || ""}
                                onChange={(event) => setFormData({ ...formData, amount: Number(event.target.value) })}
                                required
                                min="1"
                                placeholder="10000"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Deskripsi *</label>
                            <input
                                type="text"
                                className={inputCls}
                                value={formData.description}
                                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                                required
                                placeholder="e.g., Iuran bulanan"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" className={btnOutline} onClick={resetForm}>Batal</button>
                        <button type="submit" className={btnPrimary} disabled={submitting}>
                            {submitting ? "Menyimpan..." : editingId ? "Update" : "Tambah Transaksi"}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                open={confirmState.open}
                title="Hapus Transaksi"
                message={`Hapus "${confirmState.label}"? Anda punya 5 detik untuk undo.`}
                confirmLabel="Hapus"
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmState({ open: false, id: "", label: "" })}
            />

            <UndoSnackbar
                open={!!pendingDelete}
                message={`"${pendingDelete?.label}" akan dihapus`}
                duration={UNDO_DURATION}
                onUndo={handleUndo}
            />
        </>
    );
}
