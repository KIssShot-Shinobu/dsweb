"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { UndoSnackbar } from "@/components/dashboard/undo-snackbar";
import { FormSelect } from "@/components/dashboard/form-select";
import { RowActions } from "@/components/dashboard/row-actions";
import { btnOutline, btnPrimary, filterBarCls, inputCls, labelCls } from "@/components/dashboard/form-styles";
import {
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";

interface Transaction {
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    userId: string | null;
    user: { fullName: string } | null;
}

interface UserOption {
    id: string;
    fullName: string;
    role: string;
}

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

export default function TreasuryPage() {
    const currentYear = new Date().getFullYear();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(0);
    const [income, setIncome] = useState(0);
    const [expense, setExpense] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ amount: 0, description: "", type: "MASUK", userId: "NONE" });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<"ALL" | "MASUK" | "KELUAR">("ALL");
    const [month, setMonth] = useState("ALL");
    const [year, setYear] = useState("ALL");
    const [users, setUsers] = useState<UserOption[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);

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
        const params = new URLSearchParams({
            month,
            year,
            page: String(page),
            limit: String(PER_PAGE),
        });
        if (filter !== "ALL") {
            params.set("type", filter);
        }

        fetch(`/api/treasury?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                setTransactions(data.transactions || []);
                setBalance(data.balance || 0);
                setIncome(data.income || 0);
                setExpense(data.expense || 0);
                setTotal(data.total || 0);
            })
            .catch(() => {
                setTransactions([]);
                setBalance(0);
                setIncome(0);
                setExpense(0);
                setTotal(0);
            })
            .finally(() => setLoading(false));
    }, [filter, month, page, year]);

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
        setFormData({ amount: 0, description: "", type: "MASUK", userId: "NONE" });
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
            <div className="space-y-5 lg:space-y-6">
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

                <DashboardPanel title="Filter Periode" description="Pilih bulan, tahun, dan tipe transaksi untuk mempersempit daftar kas guild.">
                    <div className={filterBarCls}>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_140px_180px_auto]">
                            <FormSelect value={month} onChange={(value) => { setMonth(value); setPage(1); }} options={monthOptions} />
                            <FormSelect value={year} onChange={(value) => { setYear(value); setPage(1); }} options={yearOptions} />
                            <FormSelect value={filter} onChange={(value) => { setFilter(value as "ALL" | "MASUK" | "KELUAR"); setPage(1); }} options={filterOptions} />
                            <button className={btnOutline} onClick={() => { setMonth("ALL"); setYear("ALL"); setFilter("ALL"); setPage(1); }}>
                                Reset Filter
                            </button>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title="Daftar Transaksi" description={`Menampilkan ${total} transaksi pada periode yang dipilih.`}>
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
                                            <div className="truncate text-sm font-semibold text-base-content">{transaction.description}</div>
                                            <div className="truncate text-xs text-base-content/45">
                                                {formatDate(transaction.createdAt)} - {transaction.user?.fullName || "Kas umum"}
                                            </div>
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
                        <label className={labelCls}>Terkait User</label>
                        <FormSelect value={formData.userId} onChange={(value) => setFormData((prev) => ({ ...prev, userId: value }))} options={userSelectOptions} disabled={usersLoading} />
                    </div>
                    <div>
                        <label className={labelCls}>Nominal (IDR)</label>
                        <input type="number" className={inputCls} value={formData.amount || ""} onChange={(event) => setFormData((prev) => ({ ...prev, amount: Number(event.target.value) }))} required min="1" placeholder="10000" />
                    </div>
                    <div>
                        <label className={labelCls}>Deskripsi</label>
                        <input type="text" className={inputCls} value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} required placeholder="Contoh: Iuran bulanan guild" />
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
