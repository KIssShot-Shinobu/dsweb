"use client";

import Link from "next/link";
import { DashboardEmptyState, DashboardPanel } from "@/components/dashboard/page-shell";
import { useLocale } from "@/hooks/use-locale";
import { formatCurrency, formatDate } from "@/lib/i18n/format";

interface Tournament {
    id: string;
    title: string;
    gameType: string;
    status: string;
    startAt: string;
    prizePool: number;
    maxPlayers?: number | null;
    _count?: { participants: number };
}

const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
        case "ONGOING":
            return "badge-success";
        case "COMPLETED":
            return "badge-ghost";
        case "CANCELLED":
            return "badge-error";
        default:
            return "badge-info";
    }
};

export function TournamentList({
    tournaments,
    loading = false,
}: {
    tournaments: Tournament[];
    loading?: boolean;
}) {
    const { t, locale } = useLocale();
    const getGameIcon = (gameType: string) => (gameType.toLowerCase().includes("master") ? "MD" : "DL");

    return (
        <DashboardPanel
            title={t.dashboard.tournaments.list.title}
            description={t.dashboard.tournaments.list.description}
            action={
                <Link href="/dashboard/tournaments" className="btn btn-outline btn-sm rounded-box">
                    {t.dashboard.tournaments.list.manage}
                </Link>
            }
        >
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3">
                            <div className="skeleton h-10 w-10 rounded-2xl" />
                            <div className="flex-1 space-y-2">
                                <div className="skeleton h-3 w-3/5" />
                                <div className="skeleton h-2.5 w-2/5" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : tournaments.length === 0 ? (
                <DashboardEmptyState
                    title={t.dashboard.tournaments.list.emptyTitle}
                    description={t.dashboard.tournaments.list.emptyDescription}
                    actionHref="/dashboard/tournaments"
                    actionLabel={t.dashboard.tournaments.list.createTournament}
                />
            ) : (
                <div className="space-y-3">
                    {tournaments.map((tournament) => (
                        <div key={tournament.id} className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3 transition-all hover:border-primary/20 hover:bg-base-100 sm:p-4">
                            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${tournament.gameType.toLowerCase().includes("master") ? "bg-secondary/12 text-secondary" : "bg-info/12 text-info"}`}>
                                {getGameIcon(tournament.gameType)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-base-content">{tournament.title}</div>
                                <div className="text-xs text-base-content/50">
                                    {formatDate(tournament.startAt, locale)} - {formatCurrency(tournament.prizePool, locale, "IDR")} - {tournament.maxPlayers
                                        ? t.dashboard.tournaments.list.participantsWithCap(
                                              tournament._count?.participants || 0,
                                              tournament.maxPlayers
                                          )
                                        : t.dashboard.tournaments.list.participants(tournament._count?.participants || 0)}
                                </div>
                            </div>
                            <span className={`badge h-auto px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getStatusBadge(tournament.status)}`}>
                                {tournament.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </DashboardPanel>
    );
}
