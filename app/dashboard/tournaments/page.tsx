"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { UndoSnackbar } from "@/components/dashboard/undo-snackbar";
import { FormSelect } from "@/components/dashboard/form-select";
import { RowActions } from "@/components/dashboard/row-actions";
import { TournamentBracketAdmin } from "@/components/dashboard/tournament-bracket-admin";
import { btnOutline, btnPrimary, dashboardStackCls, searchInputCls } from "@/components/dashboard/form-styles";
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
    structure?: "SINGLE_ELIM" | "DOUBLE_ELIM" | "SWISS";
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
    const [showBracketModal, setShowBracketModal] = useState(false);
    const [activeBracketTournament, setActiveBracketTournament] = useState<{
        id: string;
        title: string;
        structure: "SINGLE_ELIM" | "DOUBLE_ELIM" | "SWISS";
        status: "OPEN" | "ONGOING" | "COMPLETED" | "CANCELLED";
    } | null>(null);
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
    const router = useRouter();

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

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

    const handleStartBracket = async (tournament: Tournament) => {
        const participantCount = tournament._count?.participants ?? 0;
        if (tournament.status !== "OPEN") {
            error("Bracket hanya bisa dibuat saat turnamen masih OPEN.");
            return;
        }
        if (participantCount < 2) {
            error("Minimal 2 peserta untuk membuat bracket.");
            return;
        }

        try {
            const res = await fetch(`/api/tournaments/${tournament.id}/start`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                success(data?.message || "Turnamen dimulai.");
                fetchTournaments();
            } else {
                error(data?.message || "Gagal membuat bracket.");
            }
        } catch {
            error("Kesalahan jaringan.");
        }
    };

    const openBracketModal = (tournament: Tournament) => {
        const structure = tournament.structure || "SINGLE_ELIM";
        setActiveBracketTournament({ id: tournament.id, title: tournament.title, structure, status: tournament.status });
        setShowBracketModal(true);
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
                    actions={
                        <Link href="/dashboard/tournaments/new" className={btnPrimary}>
                            + Buat Turnamen
                        </Link>
                    }
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
                                                    onEdit={() => router.push(`/dashboard/tournaments/${tournament.id}/settings`)}
                                                    onDelete={() => handleDeleteClick(tournament.id, tournament.title)}
                                                    extra={
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                onClick={() => handleStartBracket(tournament)}
                                                                disabled={tournament.status !== "OPEN" || (tournament._count?.participants ?? 0) < 2}
                                                                className={`${btnPrimary} btn-sm disabled:opacity-40`}
                                                            >
                                                                Start Bracket
                                                            </button>
                                                            <button
                                                                onClick={() => updateStatus(tournament)}
                                                                disabled={tournament.status === "COMPLETED" || tournament.status === "CANCELLED"}
                                                                className={`${btnOutline} btn-sm disabled:opacity-40`}
                                                            >
                                                                Next Status
                                                            </button>
                                                            <button
                                                                onClick={() => openBracketModal(tournament)}
                                                                className={`${btnOutline} btn-sm`}
                                                            >
                                                                Manage Bracket
                                                            </button>
                                                            <Link href={`/dashboard/tournaments/${tournament.id}`} className={`${btnOutline} btn-sm`}>
                                                                Admin Dashboard
                                                            </Link>
                                                            <Link href={`/tournaments/${tournament.id}`} className={`${btnOutline} btn-sm`}>
                                                                Lihat Detail
                                                            </Link>
                                                        </div>
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

            <ConfirmModal
                open={confirmState.open}
                title="Hapus Turnamen"
                message={`Hapus turnamen "${confirmState.title}"? Anda punya 5 detik untuk undo.`}
                confirmLabel="Hapus"
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmState({ open: false, id: "", title: "" })}
            />

            <UndoSnackbar open={!!pendingDelete} message={`"${pendingDelete?.title}" akan dihapus`} duration={UNDO_DURATION} onUndo={handleUndo} />

            <Modal
                open={showBracketModal}
                onClose={() => { setShowBracketModal(false); setActiveBracketTournament(null); }}
                title={activeBracketTournament ? `Bracket: ${activeBracketTournament.title}` : "Bracket"}
                size="xl"
            >
                {activeBracketTournament ? (
                    <TournamentBracketAdmin
                        tournamentId={activeBracketTournament.id}
                        structure={activeBracketTournament.structure}
                        status={activeBracketTournament.status}
                        onUpdated={fetchTournaments}
                    />
                ) : null}
            </Modal>
        </DashboardPageShell>
    );
}
