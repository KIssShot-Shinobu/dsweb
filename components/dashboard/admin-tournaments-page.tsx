"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { UndoSnackbar } from "@/components/dashboard/undo-snackbar";
import { FormSelect } from "@/components/dashboard/form-select";
import { RowActions } from "@/components/dashboard/row-actions";
import { btnOutline, btnPrimary, dashboardStackCls, searchInputCls } from "@/components/dashboard/form-styles";
import {
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { useLocale } from "@/hooks/use-locale";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";

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
    maxPlayers?: number | null;
    startAt: string;
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

const EMPTY_SUMMARY = { open: 0, ongoing: 0, completed: 0, cancelled: 0 };

export default function AdminTournamentsPage() {
    const { locale, t } = useLocale();
    const selectOptions = {
        filterStatus: [
            { value: "ALL", label: t.dashboard.tournamentsAdmin.filters.statusAll },
            { value: "OPEN", label: "OPEN" },
            { value: "ONGOING", label: "ONGOING" },
            { value: "COMPLETED", label: "COMPLETED" },
            { value: "CANCELLED", label: "CANCELLED" },
        ],
        filterGameType: [
            { value: "ALL", label: t.dashboard.tournamentsAdmin.filters.gameAll },
            { value: "DUEL_LINKS", label: t.dashboard.tournamentsAdmin.filters.duelLinks },
            { value: "MASTER_DUEL", label: t.dashboard.tournamentsAdmin.filters.masterDuel },
        ],
    };
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
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

    const handleStartBracket = async (tournament: Tournament) => {
        const participantCount = tournament._count?.participants ?? 0;
        if (tournament.status !== "OPEN") {
            error(t.dashboard.tournamentsAdmin.errors.bracketOpenOnly);
            return;
        }
        if (participantCount < 2) {
            error(t.dashboard.tournamentsAdmin.errors.minParticipants);
            return;
        }

        try {
            const res = await fetch(`/api/tournaments/${tournament.id}/start`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                success(data?.message || t.dashboard.tournamentsAdmin.success.started);
                fetchTournaments();
            } else {
                error(data?.message || t.dashboard.tournamentsAdmin.errors.startFailed);
            }
        } catch {
            error(t.dashboard.tournamentsAdmin.errors.network);
        }
    };


    const executePermanentDelete = async (id: string) => {
        setPendingDelete(null);
        try {
            const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
            const data = await res.json();

            if (!res.ok) {
                error(data.message || t.dashboard.tournamentsAdmin.errors.deleteFailed);
            }
        } catch {
            error(t.dashboard.tournamentsAdmin.errors.network);
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
            success(t.dashboard.tournamentsAdmin.undoSuccess(pendingDelete.title));
        }
        setPendingDelete(null);
        fetchTournaments();
    };

    const formatCurrencyValue = (amount: number) => formatCurrency(amount, locale, "IDR");

    const formatDate = (dateString: string) =>
        formatDateTime(dateString, locale, {
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
                    kicker={t.dashboard.tournamentsAdmin.kicker}
                    title={t.dashboard.tournamentsAdmin.title}
                    description={t.dashboard.tournamentsAdmin.description}
                    actions={
                        <Link href="/dashboard/tournaments/new" className={btnPrimary}>
                            {t.dashboard.tournamentsAdmin.create}
                        </Link>
                    }
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DashboardMetricCard label={t.dashboard.tournamentsAdmin.metrics.open} value={loading ? "..." : summary.open} meta={t.dashboard.tournamentsAdmin.metrics.openMeta} tone="accent" />
                    <DashboardMetricCard label={t.dashboard.tournamentsAdmin.metrics.ongoing} value={loading ? "..." : summary.ongoing} meta={t.dashboard.tournamentsAdmin.metrics.ongoingMeta} tone="success" />
                    <DashboardMetricCard label={t.dashboard.tournamentsAdmin.metrics.completed} value={loading ? "..." : summary.completed} meta={t.dashboard.tournamentsAdmin.metrics.completedMeta} />
                    <DashboardMetricCard label={t.dashboard.tournamentsAdmin.metrics.publishedTotal} value={loading ? "..." : publishedSummary} meta={t.dashboard.tournamentsAdmin.metrics.publishedMeta} />
                </div>

                <DashboardPanel
                    title={t.dashboard.tournamentsAdmin.panelTitle}
                    description={t.dashboard.tournamentsAdmin.panelDescription(total)}
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
                                placeholder={t.dashboard.tournamentsAdmin.searchPlaceholder}
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
                        <DashboardEmptyState title={t.dashboard.tournamentsAdmin.emptyTitle} description={t.dashboard.tournamentsAdmin.emptyDescription} actionHref="/dashboard/tournaments" actionLabel={t.dashboard.tournamentsAdmin.emptyAction} />
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
                                                    {tournament.gameType} - {tournament.format} - {formatDate(tournament.startAt)}
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                                                    <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-base-content/55">
                                                        {t.dashboard.tournamentsAdmin.labels.prize} {formatCurrencyValue(tournament.prizePool)}
                                                    </span>
                                                    <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-base-content/55">
                                                        {t.dashboard.tournamentsAdmin.labels.entry} {tournament.entryFee === 0 ? t.dashboard.tournamentsAdmin.labels.freeEntry : formatCurrencyValue(tournament.entryFee)}
                                                    </span>
                                                    <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-base-content/55">
                                                        {t.dashboard.tournamentsAdmin.labels.participants(
                                                            tournament._count?.participants || 0,
                                                            tournament.maxPlayers
                                                        )}
                                                    </span>
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
                                                                {t.dashboard.tournamentsAdmin.actions.startBracket}
                                                            </button>
                                                            <Link href={`/dashboard/tournaments/${tournament.id}`} className={`${btnOutline} btn-sm`}>
                                                                {t.dashboard.tournamentsAdmin.actions.adminDashboard}
                                                            </Link>
                                                            <Link href={`/tournaments/${tournament.id}`} className={`${btnOutline} btn-sm`}>
                                                                {t.dashboard.tournamentsAdmin.actions.viewDetail}
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
                title={t.dashboard.tournamentsAdmin.confirmDeleteTitle}
                message={t.dashboard.tournamentsAdmin.confirmDeleteMessage(confirmState.title)}
                confirmLabel={t.dashboard.tournamentsAdmin.confirmDeleteLabel}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmState({ open: false, id: "", title: "" })}
            />

            <UndoSnackbar open={!!pendingDelete} message={pendingDelete ? t.dashboard.tournamentsAdmin.undoMessage(pendingDelete.title) : ""} duration={UNDO_DURATION} onUndo={handleUndo} />

        </DashboardPageShell>
    );
}
