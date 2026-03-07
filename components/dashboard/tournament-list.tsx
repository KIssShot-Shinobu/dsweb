"use client";

import { DashboardEmptyState, DashboardPanel } from "@/components/dashboard/page-shell";

interface Tournament {
    id: string;
    title: string;
    gameType: string;
    status: string;
    startDate: string;
    prizePool: number;
    _count?: { participants: number };
}

const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
        case "ONGOING":
            return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        case "COMPLETED":
            return "bg-slate-400/10 text-slate-400 border-slate-400/20";
        case "CANCELLED":
            return "bg-red-500/10 text-red-400 border-red-500/20";
        default:
            return "bg-blue-500/10 text-blue-400 border-blue-400/20";
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
                <a href="/dashboard/tournaments" className="inline-flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70 dark:hover:bg-white/[0.06]">
                    Manage
                </a>
            }
        >
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50/80 p-3 dark:border-white/6 dark:bg-white/[0.03]">
                            <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/8" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-200 dark:bg-white/8" />
                                <div className="h-2.5 w-2/5 animate-pulse rounded-full bg-slate-200 dark:bg-white/8" />
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
                        <div key={tournament.id} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50/80 p-3 transition-all hover:bg-white dark:border-white/6 dark:bg-white/[0.03] dark:hover:bg-white/[0.05] sm:p-4">
                            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${tournament.gameType.toLowerCase().includes("master") ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
                                {getGameIcon(tournament.gameType)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{tournament.title}</div>
                                <div className="text-xs text-slate-400 dark:text-white/40">
                                    {formatDate(tournament.startDate)} - {formatPrize(tournament.prizePool)} - {tournament._count?.participants || 0} peserta
                                </div>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getStatusBadge(tournament.status)}`}>
                                {tournament.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </DashboardPanel>
    );
}
