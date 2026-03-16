"use client";

import Link from "next/link";
import { DashboardEmptyState, DashboardPanel } from "@/components/dashboard/page-shell";

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
    const getGameIcon = (gameType: string) => (gameType.toLowerCase().includes("master") ? "MD" : "DL");

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    const formatPrize = (amount: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);

    return (
        <DashboardPanel
            title="Tournaments"
            description="Turnamen terbaru yang sedang dibuka, berjalan, atau baru selesai."
            action={
                <Link href="/dashboard/tournaments" className="btn btn-outline btn-sm rounded-box">
                    Manage
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
                    title="Belum ada turnamen"
                    description="Buat turnamen baru untuk menampilkan jadwal, hadiah, dan peserta di dashboard utama."
                    actionHref="/dashboard/tournaments"
                    actionLabel="Buat turnamen"
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
                                    {formatDate(tournament.startAt)} - {formatPrize(tournament.prizePool)} - {tournament.maxPlayers
                                        ? `${tournament._count?.participants || 0} / ${tournament.maxPlayers} peserta`
                                        : `${tournament._count?.participants || 0} peserta`}
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
