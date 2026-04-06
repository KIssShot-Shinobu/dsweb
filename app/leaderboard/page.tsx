"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { FormSelect } from "@/components/dashboard/form-select";
import { useLocale } from "@/hooks/use-locale";

type SeasonOption = {
    id: string;
    name: string;
    startAt: string;
    endAt: string;
    isActive: boolean;
};

type PlayerEntry = {
    rank: number;
    eloRating: number;
    rankTier: string;
    wins: number;
    losses: number;
    matchesPlayed: number;
    winRate: number;
    lastMatchAt: string | null;
    user: { id: string; username: string | null; fullName: string | null; avatarUrl: string | null };
};

type TeamEntry = {
    rank: number;
    eloRating: number;
    rankTier: string;
    wins: number;
    losses: number;
    matchesPlayed: number;
    winRate: number;
    lastMatchAt: string | null;
    team: { id: string; name: string; slug: string; logoUrl: string | null };
};

const DEFAULT_LIMIT = 50;

export default function LeaderboardPage() {
    const { t } = useLocale();
    const [activeTab, setActiveTab] = useState<"players" | "teams">("players");
    const [seasonId, setSeasonId] = useState("");
    const [seasons, setSeasons] = useState<SeasonOption[]>([]);
    const [players, setPlayers] = useState<PlayerEntry[]>([]);
    const [teams, setTeams] = useState<TeamEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/leaderboard/seasons")
            .then((response) => response.json())
            .then((payload) => {
                if (payload?.success) {
                    setSeasons(payload.data || []);
                }
            })
            .catch(() => {
                setSeasons([]);
            });
    }, []);

    useEffect(() => {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("limit", String(DEFAULT_LIMIT));
        if (seasonId) params.set("seasonId", seasonId);

        const endpoint = activeTab === "players" ? "/api/leaderboard/players" : "/api/leaderboard/teams";
        fetch(`${endpoint}?${params.toString()}`)
            .then((response) => response.json())
            .then((payload) => {
                if (!payload?.success) {
                    setError(t.leaderboard.errors.loadFailed);
                    setPlayers([]);
                    setTeams([]);
                    return;
                }
                if (activeTab === "players") {
                    setPlayers(payload.data || []);
                } else {
                    setTeams(payload.data || []);
                }
            })
            .catch(() => {
                setError(t.leaderboard.errors.loadFailed);
                setPlayers([]);
                setTeams([]);
            })
            .finally(() => setLoading(false));
    }, [activeTab, seasonId, t.leaderboard.errors.loadFailed]);

    const seasonOptions = useMemo(() => {
        if (seasons.length === 0) return [];
        return [
            { value: "", label: t.leaderboard.seasonAll },
            ...seasons.map((season) => ({
                value: season.id,
                label: season.isActive ? `${season.name} - ${t.leaderboard.seasonActive}` : season.name,
            })),
        ];
    }, [seasons, t.leaderboard.seasonAll, t.leaderboard.seasonActive]);

    const activeEntries = activeTab === "players" ? players : teams;
    const tierClass = (tier: string) => {
        switch (tier) {
            case "Diamond":
                return "badge-accent";
            case "Platinum":
                return "badge-info";
            case "Gold":
                return "badge-warning";
            case "Silver":
                return "badge-secondary";
            default:
                return "badge-ghost";
        }
    };

    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto max-w-[1400px] px-4 pb-14 sm:px-6 lg:px-8">
                    <p className="mb-4 text-sm font-bold uppercase tracking-[0.34em] text-primary">{t.leaderboard.badge}</p>
                    <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                        {t.leaderboard.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-base-content/65 sm:text-base">
                        {t.leaderboard.subtitle}
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="tabs tabs-boxed">
                        <button
                            type="button"
                            className={`tab ${activeTab === "players" ? "tab-active" : ""}`}
                            onClick={() => setActiveTab("players")}
                        >
                            {t.leaderboard.tabs.players}
                        </button>
                        <button
                            type="button"
                            className={`tab ${activeTab === "teams" ? "tab-active" : ""}`}
                            onClick={() => setActiveTab("teams")}
                        >
                            {t.leaderboard.tabs.teams}
                        </button>
                    </div>

                    {seasonOptions.length > 0 ? (
                        <div className="w-full max-w-[280px]">
                            <FormSelect value={seasonId} onChange={setSeasonId} options={seasonOptions} />
                        </div>
                    ) : null}
                </div>

                {error ? (
                    <div className="alert alert-error mb-6 rounded-box text-sm">
                        {error}
                    </div>
                ) : null}

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((item) => (
                            <div key={item} className="skeleton h-14 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : activeEntries.length === 0 ? (
                    <div className="card border border-base-300 bg-base-100 shadow-xl">
                        <div className="card-body items-center px-6 py-16 text-center">
                            <div className="mb-3 text-4xl text-primary">[]</div>
                            <h2 className="text-xl font-black text-base-content sm:text-2xl">{t.leaderboard.emptyTitle}</h2>
                            <p className="mt-3 text-sm text-base-content/60 sm:text-base">{t.leaderboard.emptySubtitle}</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
                        <table className="table">
                            <thead>
                                <tr className="text-xs uppercase tracking-widest text-base-content/70">
                                    <th>{t.leaderboard.columns.rank}</th>
                                    <th>{activeTab === "players" ? t.leaderboard.columns.player : t.leaderboard.columns.team}</th>
                                    <th>{t.leaderboard.columns.elo}</th>
                                    <th>{t.leaderboard.columns.record}</th>
                                    <th>{t.leaderboard.columns.winRate}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeTab === "players"
                                  ? players.map((entry) => {
                                          const displayName = entry.user.username || entry.user.fullName || t.common.userFallback;
                                          return (
                                              <tr key={entry.user.id}>
                                                  <th className="font-semibold">{entry.rank}</th>
                                                  <td className="font-semibold">
                                                      <div className="flex flex-wrap items-center gap-2">
                                                          <span>{displayName}</span>
                                                          <span className={`badge badge-sm ${tierClass(entry.rankTier)}`}>
                                                              {entry.rankTier}
                                                          </span>
                                                      </div>
                                                  </td>
                                                  <td className="font-semibold">{entry.eloRating.toFixed(2)}</td>
                                                  <td className="text-sm text-base-content/70">
                                                      {entry.wins}-{entry.losses}
                                                  </td>
                                                  <td className="text-sm text-base-content/70">
                                                      {(entry.winRate * 100).toFixed(1)}%
                                                  </td>
                                              </tr>
                                          );
                                      })
                                    : teams.map((entry) => (
                                          <tr key={entry.team.id}>
                                              <th className="font-semibold">{entry.rank}</th>
                                              <td className="font-semibold">
                                                  <div className="flex flex-wrap items-center gap-2">
                                                      <span>{entry.team.name}</span>
                                                      <span className={`badge badge-sm ${tierClass(entry.rankTier || "Bronze")}`}>
                                                          {entry.rankTier || "Bronze"}
                                                      </span>
                                                  </div>
                                              </td>
                                              <td className="font-semibold">{entry.eloRating.toFixed(2)}</td>
                                              <td className="text-sm text-base-content/70">
                                                  {entry.wins}-{entry.losses}
                                              </td>
                                              <td className="text-sm text-base-content/70">
                                                  {(entry.winRate * 100).toFixed(1)}%
                                              </td>
                                          </tr>
                                      ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <Footer />
        </main>
    );
}
