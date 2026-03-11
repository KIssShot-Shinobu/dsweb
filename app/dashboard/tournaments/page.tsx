"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { UndoSnackbar } from "@/components/dashboard/undo-snackbar";
import { FormSelect } from "@/components/dashboard/form-select";
import { RowActions } from "@/components/dashboard/row-actions";
import { btnOutline, btnPrimary, dashboardStackCls, inputCls, labelCls, searchInputCls } from "@/components/dashboard/form-styles";
import {
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { normalizeAssetUrl } from "@/lib/asset-url";

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

    const fetchTournaments = useCallback(() => {
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
    }, [gameTypeFilter, page, search, statusFilter]);

    useEffect(() => {
        fetchTournaments();
    }, [fetchTournaments]);

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

    const publishedSummary = useMemo(() => summary.open + summary.ongoing, [summary]);

    return (
        <DashboardPageShell>
            <div className={dashboardStackCls}>
                <DashboardPageHeader
                    kicker="Event Control"
                    title="Tournaments"
                    description="Kelola jadwal event, thumbnail, hadiah, dan pergerakan status bracket dari satu halaman yang lebih ringkas."
                    actions={<button onClick={() => setShowModal(true)} className={btnPrimary}>+ Buat Turnamen</button>}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DashboardMetricCard label="Open" value={loading ? "..." : summary.open} meta="Registrasi dibuka" tone="accent" />
                    <DashboardMetricCard label="Ongoing" value={loading ? "..." : summary.ongoing} meta="Sedang berjalan" tone="success" />
                    <DashboardMetricCard label="Completed" value={loading ? "..." : summary.completed} meta="Event selesai" />
                    <DashboardMetricCard label="Published Total" value={loading ? "..." : publishedSummary} meta="Open + ongoing yang tampil ke user" />
                </div>

                <DashboardPanel
                    title="Daftar Tournament"
                    description={`Menampilkan ${total} turnamen yang sesuai dengan filter aktif.`}
                    action={(
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
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
                                placeholder="Cari turnamen..."
                                className={`${searchInputCls} h-9 sm:w-52`}
                            />
                            <FormSelect value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }} options={selectOptions.filterStatus} className="w-full sm:w-36" />
                            <FormSelect value={gameTypeFilter} onChange={(value) => { setGameTypeFilter(value); setPage(1); }} options={selectOptions.filterGameType} className="w-full sm:w-36" />
                        </div>
                    )}
                >
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="h-24 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                            ))}
                        </div>
                    ) : tournaments.length === 0 ? (
                        <DashboardEmptyState title="Tidak ada turnamen" description="Coba ubah filter atau buat turnamen baru untuk mengisi halaman ini." actionHref="/dashboard/tournaments" actionLabel="Reset via halaman ini" />
                    ) : (
                        <>
                            <div className="space-y-3">
                                {tournaments.map((tournament) => {
                                    const statusTone = tournament.status === "OPEN"
                                        ? "border-info/20 bg-info/10 text-info"
                                        : tournament.status === "ONGOING"
                                          ? "border-warning/20 bg-warning/10 text-warning"
                                          : tournament.status === "COMPLETED"
                                            ? "border-success/20 bg-success/10 text-success"
                                            : "border-error/20 bg-error/10 text-error";

                                    return (
                                        <div key={tournament.id} className="flex flex-col gap-3 rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-base-100 lg:flex-row lg:items-center">
                                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-base-100 text-xs font-bold text-base-content/45">
                                                {tournament.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={normalizeAssetUrl(tournament.image) || ""} alt={tournament.title} className="h-full w-full object-cover" />
                                                ) : tournament.gameType === "MASTER_DUEL" ? "MD" : "DL"}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-semibold text-base-content">{tournament.title}</div>
                                                <div className="mt-1 truncate text-xs text-base-content/45">
                                                    {tournament.gameType} - {tournament.format} - {formatDate(tournament.startDate)}
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                                                    <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-base-content/55">Hadiah {formatCurrency(tournament.prizePool)}</span>
                                                    <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-base-content/55">Entry {tournament.entryFee === 0 ? "FREE" : formatCurrency(tournament.entryFee)}</span>
                                                    <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-base-content/55">{tournament._count?.participants || 0} peserta</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${statusTone}`}>
                                                    {tournament.status}
                                                </span>
                                                <RowActions
                                                    onEdit={() => openEditModal(tournament)}
                                                    onDelete={() => handleDeleteClick(tournament.id, tournament.title)}
                                                    extra={
                                                        <button
                                                            onClick={() => updateStatus(tournament)}
                                                            disabled={tournament.status === "COMPLETED" || tournament.status === "CANCELLED"}
                                                            className={`${btnOutline} disabled:opacity-40`}
                                                        >
                                                            Next Status
                                                        </button>
                                                    }
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-5">
                                <Pagination page={page} totalPages={totalPages} total={total} perPage={PER_PAGE} onPage={setPage} />
                            </div>
                        </>
                    )}
                </DashboardPanel>
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

            <UndoSnackbar open={!!pendingDelete} message={`"${pendingDelete?.title}" akan dihapus`} duration={UNDO_DURATION} onUndo={handleUndo} />
        </DashboardPageShell>
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
                <textarea className={`${inputCls} min-h-[104px] resize-y`} rows={3} value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} />
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
                {showStatus ? (
                    <div>
                        <label className={labelCls}>Status</label>
                        <FormSelect value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))} options={selectOptions.status} />
                    </div>
                ) : null}
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
                    className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
                    onChange={async (e) => {
                        const inputEl = e.currentTarget;
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await onUploadImage(file);
                        inputEl.value = "";
                    }}
                    disabled={uploadingImage}
                />
                {uploadingImage ? <p className="mt-2 text-xs text-base-content/45">Mengupload gambar...</p> : null}
            </div>
            <div>
                <label className={labelCls}>Path Gambar Lokal</label>
                <input type="text" className={inputCls} placeholder="/uploads/namafile.jpg" value={formData.image} onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))} />
                <p className="mt-2 text-xs text-base-content/45">Gunakan upload internal. URL eksternal tidak didukung lagi.</p>
            </div>
            {formData.image ? (
                <div className="rounded-box border border-base-300 bg-base-200/40 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={normalizeAssetUrl(formData.image) || ""} alt="Preview tournament" className="h-44 w-full rounded-xl object-cover" />
                    <button type="button" onClick={() => setFormData((prev) => ({ ...prev, image: "" }))} className="mt-3 text-xs font-medium text-error hover:text-error/80">
                        Hapus gambar
                    </button>
                </div>
            ) : null}
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
