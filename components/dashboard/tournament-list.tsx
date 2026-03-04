"use client";

import { useEffect, useState } from "react";

interface Tournament {
    id: string;
    title: string;
    gameType: string;
    status: string;
    startDate: string;
    prizePool: number;
}

const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
        case "ONGOING":
            return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        case "COMPLETED":
            return "bg-gray-400/10 text-gray-400 border-gray-400/20";
        default:
            return "bg-blue-500/10 text-blue-400 border-blue-400/20";
    }
};

export function TournamentList() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/tournaments")
            .then((res) => res.json())
            .then((data) => {
                setTournaments(data.slice(0, 5));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const getGameIcon = (gameType: string) =>
        gameType.toLowerCase().includes("master") ? "🎴" : "📱";

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric", month: "short", year: "numeric",
        });

    const formatPrize = (amount: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency", currency: "IDR", minimumFractionDigits: 0,
        }).format(amount);

    if (loading) {
        return (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Tournaments</span>
                </div>
                <div className="p-5 space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full w-3/5 animate-pulse" />
                                <div className="h-2.5 bg-gray-100 dark:bg-white/5 rounded-full w-2/5 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                <span className="text-base font-semibold text-gray-900 dark:text-white">Tournaments</span>
                <a href="/dashboard/tournaments" className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                    + New
                </a>
            </div>
            <div className="p-5">
                {tournaments.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-3xl mb-2">🏆</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No tournaments</div>
                        <p className="text-xs text-gray-400">Create your first tournament</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {tournaments.map((tournament) => (
                            <div key={tournament.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${tournament.gameType.toLowerCase().includes("master")
                                        ? "bg-purple-500/10"
                                        : "bg-blue-500/10"
                                    }`}>
                                    {getGameIcon(tournament.gameType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{tournament.title}</div>
                                    <div className="text-xs text-gray-400 dark:text-white/40">
                                        {formatDate(tournament.startDate)} · {formatPrize(tournament.prizePool)}
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(tournament.status)}`}>
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
