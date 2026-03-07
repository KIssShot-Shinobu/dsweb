"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { FormSelect } from "@/components/dashboard/form-select";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { UndoSnackbar } from "@/components/dashboard/undo-snackbar";
import { Pagination } from "@/components/dashboard/pagination";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { RowActions } from "@/components/dashboard/row-actions";

interface Tournament {
    id: string;
    title: string;
    description: string | null;
    gameType: "DUEL_LINKS" | "MASTER_DUEL";
    format: "BO1" | "BO3" | "BO5";
    status: "OPEN" | "ONGOING" | "COMPLETED" | "CANCELLED";
    entryFee: number;
    prizePool: number;
    startDate: string;
    image?: string | null;
    _count?: { participants: number };
}

interface TournamentResponse {
    tournaments: Tournament[];
    total: number;
    summary: {
        open: number;
        ongoing: number;
        completed: number;
        cancelled: number;
    };
}

const UNDO_DURATION = 5000;
const PER_PAGE = 10;

const selectOptions = {
    gameType: [
        { value: "DUEL_LINKS", label: "Duel Links" },
        { value: "MASTER_DUEL", label: "Master Duel" },
    ],
    format: [
        { value: "BO1", label: "Best of 1" },
        { value: "BO3", label: "Best of 3" },
        { value: "BO5", label: "Best of 5" },
    ],
    status: [
        { value: "OPEN", label: "OPEN" },
        { value: "ONGOING", label: "ONGOING" },
        { value: "COMPLETED", label: "COMPLETED" },
        { value: "CANCELLED", label: "CANCELLED" },
    ],
    filterStatus: [
        { value: "ALL", label: "Semua Status" },
        { value: "OPEN", label: "OPEN" },
        { value: "ONGOING", label: "ONGOING" },
        { value: "COMPLETED", label: "COMPLETED" },
        { value: "CANCELLED", label: "CANCELLED" },
    ],
    filterGameType: [
        { value: "ALL", label: "Semua Game" },
        { value: "DUEL_LINKS", label: "Duel Links" },
        { value: "MASTER_DUEL", label: "Master Duel" },
    ],
};

const EMPTY_SUMMARY = { open: 0, ongoing: 0, completed: 0, cancelled: 0 };

export default function AdminTournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [gameTypeFilter, setGameTypeFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState(EMPTY_SUMMARY);
    const { success, error } = useToast();
    const [confirmState, setConfirmState] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: "", title: "" });
    const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string; item: Tournament } | null>(null);
    const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        gameType: "DUEL_LINKS",
        format: "BO3",
        status: "OPEN",
        entryFee: 0,
        prizePool: 0,
        startDate: "",
        image: "",
    });

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            gameType: "DUEL_LINKS",
            format: "BO3",
            status: "OPEN",
            entryFee: 0,
            prizePool: 0,
            startDate: "",
            image: "",
        });
    };

    const toDateTimeLocal = (dateString: string) => {
        const date = new Date(dateString);
        const pad = (num: number) => String(num).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const fetchTournaments = () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: String(page),
            limit: String(PER_PAGE),
        });
        if (search.trim()) params.set("search", search.trim());
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (gameTypeFilter !== "ALL") params.set("gameType", gameTypeFilter);

        fetch(`/api/tournaments?${params.toString()}`)
            .then((res) => res.json())
            .then((data: TournamentResponse) => {
                setTournaments(data.tournaments || []);
                setTotal(data.total || 0);
                setSummary(data.summary || EMPTY_SUMMARY);
            })
            .catch(() => {
                setTournaments([]);
                setTotal(0);
                setSummary(EMPTY_SUMMARY);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchTournaments();
    }, [page, statusFilter, gameTypeFilter, search]);

    useEffect(
        () => () => {
            if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        },
        []
    );

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/tournaments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (res.ok) {
                success("Turnamen berhasil dibuat.");
                setShowModal(false);
                resetForm();
                fetchTournaments();
            } else {
                error(data.message || "Gagal membuat turnamen.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (tournament: Tournament) => {
        const statusOrder = ["OPEN", "ONGOING", "COMPLETED"];
        const currentIndex = statusOrder.indexOf(tournament.status);
        const nextStatus = statusOrder[currentIndex + 1] || "COMPLETED";

        if (tournament.status === "COMPLETED" || tournament.status === "CANCELLED") return;

        try {
            const res = await fetch(`/api/tournaments/${tournament.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus }),
            });

            const data = await res.json();
            if (res.ok) {
                success(`Status diubah ke ${nextStatus}.`);
                fetchTournaments();
            } else {
                error(data.message || "Gagal mengubah status.");
            }
        } catch {
            error("Kesalahan jaringan.");
        }
    };

    const openEditModal = (tournament: Tournament) => {
        setEditingTournamentId(tournament.id);
        setFormData({
            title: tournament.title,
            description: tournament.description || "",
            gameType: tournament.gameType,
            format: tournament.format,
            status: tournament.status,
            entryFee: tournament.entryFee,
            prizePool: tournament.prizePool,
            startDate: toDateTimeLocal(tournament.startDate),
            image: tournament.image || "",
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTournamentId) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/tournaments/${editingTournamentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();

            if (res.ok) {
                success("Turnamen berhasil diupdate.");
                setShowEditModal(false);
                setEditingTournamentId(null);
                resetForm();
                fetchTournaments();
            } else {
                error(data.message || "Gagal update turnamen.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setSubmitting(false);
        }
    };

    const executePermanentDelete = async (id: string) => {
        setPendingDelete(null);
        try {
            const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
            const data = await res.json();

            if (!res.ok) {
                error(data.message || "Gagal menghapus turnamen.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            fetchTournaments();
        }
    };

    const handleDeleteClick = (id: string, title: string) => {
        if (pendingDelete && deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            executePermanentDelete(pendingDelete.id);
        }
        setConfirmState({ open: true, id, title });
    };

    const handleConfirmDelete = () => {
        const { id, title } = confirmState;
        const item = tournaments.find((tournament) => tournament.id === id);
        if (!item) return;

        setConfirmState({ open: false, id: "", title: "" });
        setTournaments((prev) => prev.filter((tournament) => tournament.id !== id));
        setPendingDelete({ id, title, item });

        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = setTimeout(() => executePermanentDelete(id), UNDO_DURATION);
    };

    const handleUndo = () => {
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        if (pendingDelete) {
            setTournaments((prev) => [pendingDelete.item, ...prev].slice(0, PER_PAGE));
            success(`"${pendingDelete.title}" dipulihkan.`);
        }
        setPendingDelete(null);
        fetchTournaments();
    };

    const handleUploadImage = async (file: File) => {
        setUploadingImage(true);
        try {
            const body = new FormData();
            body.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body,
            });
            const data = await res.json();

            if (res.ok && data?.url) {
                setFormData((prev) => ({ ...prev, image: data.url }));
                success("Gambar berhasil diupload.");
            } else {
                error(data?.message || "Gagal upload gambar.");
            }
        } catch {
            error("Kesalahan jaringan saat upload.");
        } finally {
            setUploadingImage(false);
        }
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

    return (
        <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">Tournaments</h1>
                    <p className="mt-0.5 text-sm text-gray-400 dark:text-white/40">Kelola turnamen, status, hadiah, dan jadwal dari satu halaman.</p>
                </div>
                <button onClick={() => setShowModal(true)} className={btnPrimary}>
                    + Buat Turnamen
                </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-blue-400/80">Open</div>
                    <div className="mt-2 text-2xl font-bold text-blue-400">{summary.open}</div>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">Ongoing</div>
                    <div className="mt-2 text-2xl font-bold text-amber-400">{summary.ongoing}</div>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">Completed</div>
                    <div className="mt-2 text-2xl font-bold text-emerald-400">{summary.completed}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/5 dark:bg-[#1a1a1a]">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Cancelled</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{summary.cancelled}</div>
                </div>
            </div>

            <div className="mb-4 flex flex-col gap-3 md:flex-row">
                <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => {
                        const nextValue = event.target.value;
                        setSearchInput(nextValue);
                        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                        searchTimeoutRef.current = setTimeout(() => {
                            setPage(1);
                            setSearch(nextValue);
                        }, 250);
                    }}
                    placeholder="Cari judul atau deskripsi turnamen..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-ds-amber dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white md:flex-1"
                />
                <div className="w-full md:w-[180px]">
                    <FormSelect value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }} options={selectOptions.filterStatus} />
                </div>
                <div className="w-full md:w-[180px]">
                    <FormSelect value={gameTypeFilter} onChange={(value) => { setGameTypeFilter(value); setPage(1); }} options={selectOptions.filterGameType} />
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1a1a1a]">
                <div className="border-b border-gray-100 p-4 text-base font-semibold text-gray-900 dark:border-white/5 dark:text-white md:p-5">
                    Daftar Turnamen ({total})
                </div>
                <div className="p-4 md:p-5">
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
                            ))}
                        </div>
                    ) : tournaments.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="mb-2 text-4xl">[]</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">Tidak ada turnamen</div>
                            <p className="text-xs text-gray-400">Coba ubah filter atau buat turnamen baru.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {tournaments.map((tournament) => (
                                    <div key={tournament.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-xs text-gray-400 dark:bg-white/5">
                                            {tournament.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={tournament.image} alt={tournament.title} className="h-full w-full object-cover" />
                                            ) : (
                                                tournament.gameType === "MASTER_DUEL" ? "MD" : "DL"
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{tournament.title}</div>
                                            <div className="truncate text-xs text-gray-400 dark:text-white/40">
                                                {tournament.gameType} · {tournament.format} · {formatDate(tournament.startDate)}
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                                                <span className="rounded-full border border-gray-200 px-2 py-0.5 text-gray-500 dark:border-white/10 dark:text-white/50">
                                                    Hadiah {formatCurrency(tournament.prizePool)}
                                                </span>
                                                <span className="rounded-full border border-gray-200 px-2 py-0.5 text-gray-500 dark:border-white/10 dark:text-white/50">
                                                    Entry {tournament.entryFee === 0 ? "FREE" : formatCurrency(tournament.entryFee)}
                                                </span>
                                                <span className="rounded-full border border-gray-200 px-2 py-0.5 text-gray-500 dark:border-white/10 dark:text-white/50">
                                                    {tournament._count?.participants || 0} peserta
                                                </span>
                                            </div>
                                        </div>
                                        <div className="hidden min-w-[96px] flex-col items-end gap-1 md:flex">
                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tournament.status === "OPEN"
                                                ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                                                : tournament.status === "ONGOING"
                                                    ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                                    : tournament.status === "COMPLETED"
                                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                                        : "border-red-500/20 bg-red-500/10 text-red-400"
                                                }`}>
                                                {tournament.status}
                                            </span>
                                        </div>
                                        <RowActions
                                            onEdit={() => openEditModal(tournament)}
                                            onDelete={() => handleDeleteClick(tournament.id, tournament.title)}
                                            extra={(
                                                <button
                                                    onClick={() => updateStatus(tournament)}
                                                    disabled={tournament.status === "COMPLETED" || tournament.status === "CANCELLED"}
                                                    className={`${btnOutline} disabled:opacity-40`}
                                                >
                                                    Next Status
                                                </button>
                                            )}
                                        />
                                    </div>
                                ))}
                            </div>
                            <Pagination page={page} totalPages={totalPages} total={total} perPage={PER_PAGE} onPage={setPage} />
                        </>
                    )}
                </div>
            </div>

            <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="Buat Turnamen Baru">
                <TournamentForm
                    formData={formData}
                    setFormData={setFormData}
                    uploadingImage={uploadingImage}
                    submitting={submitting}
                    onUploadImage={handleUploadImage}
                    onSubmit={handleCreate}
                    submitLabel="Buat Turnamen"
                />
            </Modal>

            <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditingTournamentId(null); resetForm(); }} title="Edit Turnamen">
                <TournamentForm
                    formData={formData}
                    setFormData={setFormData}
                    uploadingImage={uploadingImage}
                    submitting={submitting}
                    onUploadImage={handleUploadImage}
                    onSubmit={handleUpdate}
                    showStatus
                    submitLabel="Simpan Perubahan"
                />
            </Modal>

            <ConfirmModal
                open={confirmState.open}
                title="Hapus Turnamen"
                message={`Hapus turnamen "${confirmState.title}"? Anda punya 5 detik untuk undo.`}
                confirmLabel="Hapus"
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmState({ open: false, id: "", title: "" })}
            />

            <UndoSnackbar
                open={!!pendingDelete}
                message={`"${pendingDelete?.title}" akan dihapus`}
                duration={UNDO_DURATION}
                onUndo={handleUndo}
            />
        </>
    );
}

function TournamentForm({
    formData,
    setFormData,
    uploadingImage,
    submitting,
    onUploadImage,
    onSubmit,
    submitLabel,
    showStatus = false,
}: {
    formData: {
        title: string;
        description: string;
        gameType: string;
        format: string;
        status: string;
        entryFee: number;
        prizePool: number;
        startDate: string;
        image: string;
    };
    setFormData: React.Dispatch<React.SetStateAction<{
        title: string;
        description: string;
        gameType: string;
        format: string;
        status: string;
        entryFee: number;
        prizePool: number;
        startDate: string;
        image: string;
    }>>;
    uploadingImage: boolean;
    submitting: boolean;
    onUploadImage: (file: File) => Promise<void>;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    submitLabel: string;
    showStatus?: boolean;
}) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div>
                <label className={labelCls}>Judul Turnamen</label>
                <input type="text" className={inputCls} required value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div>
                <label className={labelCls}>Deskripsi</label>
                <textarea className={inputCls} rows={3} value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className={`grid gap-4 ${showStatus ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
                <div>
                    <label className={labelCls}>Game</label>
                    <FormSelect value={formData.gameType} onChange={(value) => setFormData((prev) => ({ ...prev, gameType: value }))} options={selectOptions.gameType} />
                </div>
                <div>
                    <label className={labelCls}>Format</label>
                    <FormSelect value={formData.format} onChange={(value) => setFormData((prev) => ({ ...prev, format: value }))} options={selectOptions.format} />
                </div>
                {showStatus && (
                    <div>
                        <label className={labelCls}>Status</label>
                        <FormSelect value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))} options={selectOptions.status} />
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className={labelCls}>Entry Fee (Rp)</label>
                    <input type="number" className={inputCls} value={formData.entryFee} onChange={(e) => setFormData((prev) => ({ ...prev, entryFee: Number(e.target.value) }))} min="0" />
                </div>
                <div>
                    <label className={labelCls}>Prize Pool (Rp)</label>
                    <input type="number" className={inputCls} value={formData.prizePool} onChange={(e) => setFormData((prev) => ({ ...prev, prizePool: Number(e.target.value) }))} min="0" />
                </div>
            </div>
            <div>
                <label className={labelCls}>Upload Image</label>
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className={`${inputCls} file:mr-3 file:rounded-lg file:border-0 file:bg-ds-amber/20 file:px-3 file:py-1.5 file:font-semibold file:text-ds-amber`}
                    onChange={async (e) => {
                        const inputEl = e.currentTarget;
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await onUploadImage(file);
                        inputEl.value = "";
                    }}
                    disabled={uploadingImage}
                />
                {uploadingImage && <p className="mt-1 text-xs text-gray-400">Mengupload gambar...</p>}
            </div>
            <div>
                <label className={labelCls}>Image URL</label>
                <input type="url" className={inputCls} placeholder="https://example.com/tournament.jpg" value={formData.image} onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))} />
            </div>
            {formData.image && (
                <div className="rounded-xl border border-gray-200 p-2 dark:border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.image} alt="Preview tournament" className="h-40 w-full rounded-lg object-cover" />
                    <button type="button" onClick={() => setFormData((prev) => ({ ...prev, image: "" }))} className="mt-2 text-xs text-red-500 hover:text-red-600">
                        Hapus gambar
                    </button>
                </div>
            )}
            <div>
                <label className={labelCls}>Tanggal & Waktu Mulai</label>
                <input type="datetime-local" className={inputCls} required value={formData.startDate} onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3">
                <button type="submit" disabled={submitting} className={btnPrimary}>
                    {submitting ? "Menyimpan..." : submitLabel}
                </button>
            </div>
        </form>
    );
}
