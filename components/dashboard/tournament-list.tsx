"use client";

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
            return "bg-gray-400/10 text-gray-400 border-gray-400/20";
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
    const getGameIcon = (gameType: string) =>
        gameType.toLowerCase().includes("master") ? "MD" : "DL";

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

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1a1a1a]">
                <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/5">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Tournaments</span>
                </div>
                <div className="space-y-3 p-5">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="flex items-center gap-3">
                            <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-3/5 animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />
                                <div className="h-2.5 w-2/5 animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1a1a1a]">
            <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/5">
                <span className="text-base font-semibold text-gray-900 dark:text-white">Tournaments</span>
                <a href="/dashboard/tournaments" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5">
                    + New
                </a>
            </div>
            <div className="p-5">
                {tournaments.length === 0 ? (
                    <div className="py-8 text-center">
                        <div className="mb-2 text-3xl">[]</div>
                        <div className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">No tournaments</div>
                        <p className="text-xs text-gray-400">Create your first tournament</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {tournaments.map((tournament) => (
                            <div key={tournament.id} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold ${tournament.gameType.toLowerCase().includes("master")
                                    ? "bg-purple-500/10 text-purple-400"
                                    : "bg-blue-500/10 text-blue-400"
                                    }`}>
                                    {getGameIcon(tournament.gameType)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{tournament.title}</div>
                                    <div className="text-xs text-gray-400 dark:text-white/40">
                                        {formatDate(tournament.startDate)} · {formatPrize(tournament.prizePool)} · {tournament._count?.participants || 0} peserta
                                    </div>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(tournament.status)}`}>
                                    {tournament.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
