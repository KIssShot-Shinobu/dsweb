"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { FormSelect } from "@/components/dashboard/form-select";
import { EloHistoryChart } from "@/components/leaderboard/elo-history-chart";
import { useLocale } from "@/hooks/use-locale";
import { formatDateTime } from "@/lib/i18n/format";

type SeasonOption = {
    id: string;
    name: string;
    startAt: string;
    endAt: string;
    isActive: boolean;
};

type GameOption = {
    id: string;
    code: string;
    name: string;
};

type TeamSummary = {
    rank: number;
    eloRating: number;
    rankTier: string;
    wins: number;
    losses: number;
    matchesPlayed: number;
    winRate: number;
    lastMatchAt: string | null;
    game: { id: string; name: string; code: string } | null;
    neighbors: Array<{
        rank: number;
        eloRating: number;
        rankTier: string;
        wins: number;
        losses: number;
        matchesPlayed: number;
        winRate: number;
        lastMatchAt: string | null;
        team: { id: string; name: string; slug: string; logoUrl: string | null };
    }>;
};

type HistoryEntry = {
    id: string;
    matchId: string | null;
    seasonId: string | null;
    eloBefore: number;
    eloAfter: number;
    delta: number;
    createdAt: string;
};

type SeasonCompareEntry = {
    seasonId: string | null;
    seasonName: string | null;
    seasonActive: boolean;
    seasonStartAt: string | null;
    seasonEndAt: string | null;
    eloRating: number;
    rankTier: string;
    wins: number;
    losses: number;
    matchesPlayed: number;
    winRate: number;
    lastMatchAt: string | null;
};

const HISTORY_LIMIT = 20;

export default function LeaderboardTeamDetailPage() {
    const { t, locale } = useLocale();
    const params = useParams<{ teamId: string }>();
    const searchParams = useSearchParams();
    const teamId = params?.teamId;
    const [seasonId, setSeasonId] = useState("all");
    const [gameId, setGameId] = useState("");
    const [games, setGames] = useState<GameOption[]>([]);
    const [seasons, setSeasons] = useState<SeasonOption[]>([]);
    const [summary, setSummary] = useState<TeamSummary | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [seasonCompare, setSeasonCompare] = useState<SeasonCompareEntry[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [compareLoading, setCompareLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const queryGameId = searchParams.get("gameId");
        if (queryGameId) {
            setGameId(queryGameId);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!teamId) return;
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
    }, [teamId]);

    useEffect(() => {
        fetch("/api/games")
            .then((response) => response.json())
            .then((payload) => {
                if (payload?.success) {
                    const nextGames = payload.data || [];
                    setGames(nextGames);
                    if (nextGames.length > 0) {
                        setGameId((current) => current || nextGames[0].id);
                    }
                }
            })
            .catch(() => {
                setGames([]);
            });
    }, []);

    useEffect(() => {
        setHistoryPage(1);
    }, [seasonId, gameId]);

    useEffect(() => {
        if (!teamId || !gameId) return;
        setLoading(true);
        setError(null);

        const paramsQuery = new URLSearchParams();
        paramsQuery.set("gameId", gameId);
        if (seasonId && seasonId !== "all") paramsQuery.set("seasonId", seasonId);

        fetch(`/api/leaderboard/teams/${teamId}?${paramsQuery.toString()}`)
            .then((response) => response.json())
            .then((payload) => {
                if (!payload?.success) {
                    setError(t.leaderboard.teamDetail.errors.loadFailed);
                    setSummary(null);
                    return;
                }
                setSummary(payload.data || null);
            })
            .catch(() => {
                setError(t.leaderboard.teamDetail.errors.loadFailed);
                setSummary(null);
            })
            .finally(() => setLoading(false));
    }, [seasonId, gameId, t.leaderboard.teamDetail.errors.loadFailed, teamId]);

    useEffect(() => {
        if (!teamId || !gameId) return;
        setHistoryLoading(true);

        const paramsQuery = new URLSearchParams();
        paramsQuery.set("limit", String(HISTORY_LIMIT));
        paramsQuery.set("page", String(historyPage));
        paramsQuery.set("gameId", gameId);
        if (seasonId && seasonId !== "all") paramsQuery.set("seasonId", seasonId);

        fetch(`/api/leaderboard/teams/${teamId}/history?${paramsQuery.toString()}`)
            .then((response) => response.json())
            .then((payload) => {
                if (!payload?.success) {
                    setHistory([]);
                    setHistoryTotal(0);
                    return;
                }
                setHistory(payload.data || []);
                setHistoryTotal(payload.total || 0);
            })
            .catch(() => {
                setHistory([]);
                setHistoryTotal(0);
            })
            .finally(() => setHistoryLoading(false));
    }, [historyPage, seasonId, gameId, teamId]);

    useEffect(() => {
        if (!teamId || !gameId) return;
        setCompareLoading(true);

        fetch(`/api/leaderboard/teams/${teamId}/seasons?gameId=${gameId}`)
            .then((response) => response.json())
            .then((payload) => {
                if (!payload?.success) {
                    setSeasonCompare([]);
                    return;
                }
                setSeasonCompare(payload.data || []);
            })
            .catch(() => {
                setSeasonCompare([]);
            })
            .finally(() => setCompareLoading(false));
    }, [gameId, teamId]);

    const seasonOptions = useMemo(() => {
        return [
            { value: "all", label: t.leaderboard.seasonAll },
            ...seasons.map((season) => ({
                value: season.id,
                label: season.isActive ? `${season.name} - ${t.leaderboard.seasonActive}` : season.name,
            })),
        ];
    }, [seasons, t.leaderboard.seasonAll, t.leaderboard.seasonActive]);

    const gameOptions = useMemo(() => games.map((game) => ({
        value: game.id,
        label: game.name,
    })), [games]);

    const chartValues = useMemo(() => {
        return history.slice().reverse().map((entry) => entry.eloAfter);
    }, [history]);

    const trendSnapshot = useMemo(() => {
        if (history.length === 0) {
            return { lastDelta: null, weekDelta: null, streak: null as { type: "W" | "L"; count: number } | null };
        }
        const lastEntry = history[0] ?? null;
        const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weekDelta = history.reduce((acc, entry) => {
            const entryDate = new Date(entry.createdAt);
            return entryDate >= weekStart ? acc + entry.delta : acc;
        }, 0);

        let streak: { type: "W" | "L"; count: number } | null = null;
        for (const entry of history) {
            if (entry.delta === 0) break;
            const type: "W" | "L" = entry.delta > 0 ? "W" : "L";
            if (!streak) {
                streak = { type, count: 1 };
            } else if (streak.type === type) {
                streak.count += 1;
            } else {
                break;
            }
        }

        return { lastDelta: lastEntry?.delta ?? null, weekDelta, streak };
    }, [history]);

    const formatDelta = (value: number | null) => {
        if (value === null) return t.leaderboard.teamDetail.snapshotEmpty;
        return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
    };

    const streakLabel = trendSnapshot.streak
        ? `${trendSnapshot.streak.type === "W"
            ? t.leaderboard.teamDetail.streakWinShort
            : t.leaderboard.teamDetail.streakLoseShort}${trendSnapshot.streak.count}`
        : t.leaderboard.teamDetail.snapshotEmpty;

    const totalHistoryPages = useMemo(() => Math.max(1, Math.ceil(historyTotal / HISTORY_LIMIT)), [historyTotal]);

    useEffect(() => {
        if (historyPage > totalHistoryPages) {
            setHistoryPage(totalHistoryPages);
        }
    }, [historyPage, totalHistoryPages]);

    const displayName = summary?.neighbors?.find((item) => item.team.id === teamId)?.team.name || t.leaderboard.teamDetail.teamFallback;

    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto max-w-[1200px] px-4 pb-10 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.34em] text-primary">{t.leaderboard.teamDetail.badge}</p>
                            <h1 className="mt-3 text-2xl font-black sm:text-3xl">{t.leaderboard.teamDetail.title}</h1>
                            <p className="mt-2 text-sm text-base-content/60">{t.leaderboard.teamDetail.subtitle}</p>
                        </div>
                        <Link href="/leaderboard" className="btn btn-outline btn-sm rounded-box">
                            {t.leaderboard.teamDetail.back}
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <div className="w-full max-w-[240px]">
                        <FormSelect value={gameId} onChange={setGameId} options={gameOptions} showPlaceholder={false} />
                    </div>
                    <div className="w-full max-w-[240px]">
                        <FormSelect value={seasonId} onChange={setSeasonId} options={seasonOptions} showPlaceholder={false} />
                    </div>
                </div>

                {error ? (
                    <div className="alert alert-error mb-6 rounded-box text-sm">
                        {error}
                    </div>
                ) : null}

                {loading || !summary ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="skeleton h-20 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
                                <div className="text-sm font-semibold text-base-content/60">{t.leaderboard.teamDetail.teamLabel}</div>
                                <div className="mt-1 text-2xl font-black text-base-content">{displayName}</div>
                                <div className="mt-1 text-xs text-base-content/50">{summary.game?.name ?? t.leaderboard.teamDetail.gameFallback}</div>
                                <div className="mt-3 flex flex-wrap gap-3 text-sm text-base-content/70">
                                    <div>{t.leaderboard.teamDetail.rankLabel(summary.rank)}</div>
                                    <div>{t.leaderboard.teamDetail.eloLabel(summary.eloRating.toFixed(2))}</div>
                                    <div>{t.leaderboard.teamDetail.tierLabel(summary.rankTier)}</div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3 text-sm text-base-content/60">
                                    <div>{t.leaderboard.teamDetail.recordLabel(summary.wins, summary.losses)}</div>
                                    <div>{t.leaderboard.teamDetail.winRateLabel((summary.winRate * 100).toFixed(1))}</div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
                                <div className="text-sm font-semibold text-base-content/60">{t.leaderboard.teamDetail.historyTitle}</div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-box border border-base-300 bg-base-200/40 px-3 py-2">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/60">
                                            {t.leaderboard.teamDetail.snapshotLastMatch}
                                        </div>
                                        <div className={`mt-1 text-lg font-bold ${trendSnapshot.lastDelta === null ? "text-base-content/50" : trendSnapshot.lastDelta >= 0 ? "text-success" : "text-error"}`}>
                                            {formatDelta(trendSnapshot.lastDelta)}
                                        </div>
                                    </div>
                                    <div className="rounded-box border border-base-300 bg-base-200/40 px-3 py-2">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/60">
                                            {t.leaderboard.teamDetail.snapshotLast7Days}
                                        </div>
                                        <div className={`mt-1 text-lg font-bold ${trendSnapshot.weekDelta === null ? "text-base-content/50" : trendSnapshot.weekDelta >= 0 ? "text-success" : "text-error"}`}>
                                            {formatDelta(trendSnapshot.weekDelta)}
                                        </div>
                                    </div>
                                    <div className="rounded-box border border-base-300 bg-base-200/40 px-3 py-2">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/60">
                                            {t.leaderboard.teamDetail.snapshotStreak}
                                        </div>
                                        <div className={`mt-1 text-lg font-bold ${trendSnapshot.streak ? (trendSnapshot.streak.type === "W" ? "text-success" : "text-error") : "text-base-content/50"}`}>
                                            {streakLabel}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <EloHistoryChart values={chartValues} emptyLabel={t.leaderboard.teamDetail.historyEmptyChart} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="text-sm font-semibold text-base-content/60">{t.leaderboard.teamDetail.auditTitle}</div>
                                <div className="text-xs text-base-content/50">
                                    {t.leaderboard.teamDetail.auditCount(history.length, historyTotal)}
                                </div>
                            </div>

                            {historyLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((item) => (
                                        <div key={item} className="skeleton h-12 w-full rounded-2xl" />
                                    ))}
                                </div>
                            ) : history.length === 0 ? (
                                <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-6 text-center text-sm text-base-content/60">
                                    {t.leaderboard.teamDetail.historyEmpty}
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-base-300">
                                    <table className="table">
                                        <thead>
                                            <tr className="text-xs uppercase tracking-widest text-base-content/60">
                                                <th>{t.leaderboard.teamDetail.auditColumns.date}</th>
                                                <th>{t.leaderboard.teamDetail.auditColumns.change}</th>
                                                <th>{t.leaderboard.teamDetail.auditColumns.elo}</th>
                                                <th>{t.leaderboard.teamDetail.auditColumns.match}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map((entry) => {
                                                const deltaLabel = entry.delta >= 0 ? `+${entry.delta.toFixed(2)}` : entry.delta.toFixed(2);
                                                const deltaClass = entry.delta >= 0 ? "text-success" : "text-error";
                                                return (
                                                    <tr key={entry.id}>
                                                        <td className="text-sm text-base-content/70">
                                                            {formatDateTime(entry.createdAt, locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                        </td>
                                                        <td className={`text-sm font-semibold ${deltaClass}`}>
                                                            {deltaLabel}
                                                        </td>
                                                        <td className="text-sm text-base-content/70">{entry.eloAfter.toFixed(2)}</td>
                                                        <td className="text-xs font-mono text-base-content/60">{entry.matchId ?? "-"}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {historyTotal > HISTORY_LIMIT ? (
                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-xs text-base-content/60">
                                        {t.leaderboard.teamDetail.historyPageLabel(historyPage, totalHistoryPages)}
                                    </div>
                                    <div className="join">
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm join-item"
                                            onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                                            disabled={historyPage <= 1}
                                        >
                                            {t.leaderboard.prev}
                                        </button>
                                        <button type="button" className="btn btn-ghost btn-sm join-item pointer-events-none">
                                            {historyPage} / {totalHistoryPages}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm join-item"
                                            onClick={() => setHistoryPage((current) => Math.min(totalHistoryPages, current + 1))}
                                            disabled={historyPage >= totalHistoryPages}
                                        >
                                            {t.leaderboard.next}
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="text-sm font-semibold text-base-content/60">{t.leaderboard.teamDetail.seasonCompareTitle}</div>
                            </div>
                            {compareLoading ? (
                                <div className="space-y-2">
                                    {[1, 2].map((item) => (
                                        <div key={item} className="skeleton h-12 w-full rounded-2xl" />
                                    ))}
                                </div>
                            ) : seasonCompare.length === 0 ? (
                                <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-6 text-center text-sm text-base-content/60">
                                    {t.leaderboard.teamDetail.seasonCompareEmpty}
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-base-300">
                                    <table className="table">
                                        <thead>
                                            <tr className="text-xs uppercase tracking-widest text-base-content/60">
                                                <th>{t.leaderboard.teamDetail.seasonColumns.season}</th>
                                                <th>{t.leaderboard.teamDetail.seasonColumns.elo}</th>
                                                <th>{t.leaderboard.teamDetail.seasonColumns.record}</th>
                                                <th>{t.leaderboard.teamDetail.seasonColumns.winRate}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {seasonCompare.map((entry) => (
                                                <tr key={entry.seasonId ?? "global"}>
                                                    <td className="text-sm font-semibold text-base-content">
                                                        {entry.seasonId ? entry.seasonName : t.leaderboard.seasonAll}
                                                        {entry.seasonActive ? (
                                                            <span className="ml-2 badge badge-success badge-sm">
                                                                {t.leaderboard.seasonActive}
                                                            </span>
                                                        ) : null}
                                                    </td>
                                                    <td className="text-sm text-base-content/70">{entry.eloRating.toFixed(2)}</td>
                                                    <td className="text-sm text-base-content/70">{entry.wins}-{entry.losses}</td>
                                                    <td className="text-sm text-base-content/70">{(entry.winRate * 100).toFixed(1)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>

            <Footer />
        </main>
    );
}
