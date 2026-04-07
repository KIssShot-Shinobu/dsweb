"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Info, Trophy } from "lucide-react";
import Link from "next/link";
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

type GameOption = {
    id: string;
    code: string;
    name: string;
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
    user: { id: string; ign: string | null; username: string | null; fullName: string | null; avatarUrl: string | null };
    game: { id: string; name: string; code: string };
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
    game: { id: string; name: string; code: string };
};

const DEFAULT_LIMIT = 50;

export default function LeaderboardPage() {
    const { t } = useLocale();
    const [activeTab, setActiveTab] = useState<"players" | "teams">("players");
    const [seasonId, setSeasonId] = useState("all");
    const [gameId, setGameId] = useState("");
    const [games, setGames] = useState<GameOption[]>([]);
    const [seasons, setSeasons] = useState<SeasonOption[]>([]);
    const [pageSize, setPageSize] = useState(String(DEFAULT_LIMIT));
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [searchBy, setSearchBy] = useState<"ign" | "user">("ign");
    const [tierFilter, setTierFilter] = useState("ALL");
    const [winRateFilter, setWinRateFilter] = useState("ALL");
    const [players, setPlayers] = useState<PlayerEntry[]>([]);
    const [teams, setTeams] = useState<TeamEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const perPage = useMemo(() => {
        const parsed = Number.parseInt(pageSize, 10);
        return Number.isNaN(parsed) ? DEFAULT_LIMIT : parsed;
    }, [pageSize]);

    useEffect(() => {
        setPage(1);
    }, [activeTab, seasonId, gameId, perPage, search, searchBy, tierFilter, winRateFilter]);

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

    useEffect(() => () => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (!gameId) return;
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("limit", String(perPage));
        params.set("page", String(page));
        params.set("gameId", gameId);
        if (seasonId && seasonId !== "all") params.set("seasonId", seasonId);
        if (search.trim()) params.set("search", search.trim());
        if (activeTab === "players") params.set("searchBy", searchBy);
        if (tierFilter !== "ALL") params.set("tier", tierFilter);
        if (winRateFilter !== "ALL") params.set("minWinRate", winRateFilter);

        const endpoint = activeTab === "players" ? "/api/leaderboard/players" : "/api/leaderboard/teams";
        fetch(`${endpoint}?${params.toString()}`)
            .then((response) => response.json())
            .then((payload) => {
                if (!payload?.success) {
                    setError(t.leaderboard.errors.loadFailed);
                    setPlayers([]);
                    setTeams([]);
                    setTotal(0);
                    return;
                }
                if (activeTab === "players") {
                    setPlayers(payload.data || []);
                } else {
                    setTeams(payload.data || []);
                }
                setTotal(payload.total || 0);
            })
            .catch(() => {
                setError(t.leaderboard.errors.loadFailed);
                setPlayers([]);
                setTeams([]);
                setTotal(0);
            })
            .finally(() => setLoading(false));
    }, [activeTab, seasonId, gameId, page, perPage, search, searchBy, tierFilter, winRateFilter, t.leaderboard.errors.loadFailed]);

    const seasonOptions = useMemo(() => {
        return [
            { value: "all", label: t.leaderboard.seasonAll },
            ...seasons.map((season) => ({
                value: season.id,
                label: season.isActive ? `${season.name} - ${t.leaderboard.seasonActive}` : season.name,
            })),
        ];
    }, [seasons, t.leaderboard.seasonAll, t.leaderboard.seasonActive]);

    const pageOptions = [
        { value: "25", label: t.leaderboard.pageSizeLabel(25) },
        { value: "50", label: t.leaderboard.pageSizeLabel(50) },
        { value: "100", label: t.leaderboard.pageSizeLabel(100) },
    ];

    const gameOptions = games.map((game) => ({
        value: game.id,
        label: game.name,
    }));

    const tierOptions = [
        { value: "ALL", label: t.leaderboard.filters.tierAll },
        { value: "Bronze", label: "Bronze" },
        { value: "Silver", label: "Silver" },
        { value: "Gold", label: "Gold" },
        { value: "Platinum", label: "Platinum" },
        { value: "Diamond", label: "Diamond" },
    ];

    const winRateOptions = [
        { value: "ALL", label: t.leaderboard.filters.winRateAll },
        { value: "0.4", label: t.leaderboard.filters.winRateAtLeast(40) },
        { value: "0.5", label: t.leaderboard.filters.winRateAtLeast(50) },
        { value: "0.6", label: t.leaderboard.filters.winRateAtLeast(60) },
        { value: "0.7", label: t.leaderboard.filters.winRateAtLeast(70) },
        { value: "0.8", label: t.leaderboard.filters.winRateAtLeast(80) },
    ];

    const activeEntries = activeTab === "players" ? players : teams;
    const searchPlaceholder = activeTab === "teams"
        ? t.leaderboard.filters.searchPlaceholder
        : (searchBy === "user"
            ? t.leaderboard.filters.searchPlaceholderUser
            : t.leaderboard.filters.searchPlaceholderIgn);
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);
    const medalClass = (rank: number) => {
        if (rank === 1) return "text-warning";
        if (rank === 2) return "text-info";
        if (rank === 3) return "text-amber-700";
        return "text-base-content/50";
    };
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
    const detailQuery = gameId ? `?gameId=${gameId}` : "";

    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto max-w-[1400px] px-4 pb-14 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-bold uppercase tracking-[0.34em] text-primary">{t.leaderboard.badge}</p>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm rounded-box"
                            onClick={() => setShowInfo(true)}
                            aria-label={t.leaderboard.info.label}
                        >
                            <Info className="h-4 w-4" />
                            {t.leaderboard.info.label}
                        </button>
                    </div>
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

                    <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
                        {gameOptions.length > 0 ? (
                            <div className="w-full max-w-[240px]">
                                <FormSelect value={gameId} onChange={setGameId} options={gameOptions} showPlaceholder={false} />
                            </div>
                        ) : null}
                        {seasonOptions.length > 0 ? (
                            <div className="w-full max-w-[280px]">
                                <FormSelect value={seasonId} onChange={setSeasonId} options={seasonOptions} showPlaceholder={false} />
                            </div>
                        ) : null}
                        <div className="w-full max-w-[200px]">
                            <FormSelect value={pageSize} onChange={setPageSize} options={pageOptions} showPlaceholder={false} />
                        </div>
                    </div>
                </div>

                <div className="mb-6 grid gap-3 md:grid-cols-[1fr]">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            setSearchInput(nextValue);
                            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                            searchTimeoutRef.current = setTimeout(() => setSearch(nextValue), 250);
                        }}
                        placeholder={searchPlaceholder}
                        className="input input-bordered w-full bg-base-100"
                    />
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
                ) : (
                    <>
                        <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
                            <table className="table">
                                <thead>
                                    <tr className="text-xs uppercase tracking-widest text-base-content/70">
                                        <th>{t.leaderboard.columns.rank}</th>
                                        <th>
                                            {activeTab === "players" ? (
                                                <div className="dropdown dropdown-bottom">
                                                    <label
                                                        tabIndex={0}
                                                        className="btn btn-ghost btn-xs gap-2 uppercase tracking-widest text-base-content/70"
                                                    >
                                                        {searchBy === "user"
                                                            ? t.leaderboard.filters.searchByUser
                                                            : t.leaderboard.filters.searchByIgn}
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    </label>
                                                    <ul tabIndex={0} className="menu dropdown-content z-[1] mt-2 w-44 rounded-box border border-base-300 bg-base-100 p-2 shadow">
                                                        <li>
                                                            <button type="button" onClick={() => setSearchBy("ign")}>
                                                                {t.leaderboard.filters.searchByIgn}
                                                            </button>
                                                        </li>
                                                        <li>
                                                            <button type="button" onClick={() => setSearchBy("user")}>
                                                                {t.leaderboard.filters.searchByUser}
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </div>
                                            ) : (
                                                t.leaderboard.columns.team
                                            )}
                                        </th>
                                        <th>
                                            <div className="dropdown dropdown-bottom">
                                                <label
                                                    tabIndex={0}
                                                    className="btn btn-ghost btn-xs gap-2 uppercase tracking-widest text-base-content/70"
                                                >
                                                    {tierFilter === "ALL" ? t.leaderboard.filters.tierLabel : tierFilter}
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                </label>
                                                <ul tabIndex={0} className="menu dropdown-content z-[1] mt-2 w-44 rounded-box border border-base-300 bg-base-100 p-2 shadow">
                                                    {tierOptions.map((option) => (
                                                        <li key={option.value}>
                                                            <button type="button" onClick={() => setTierFilter(option.value)}>
                                                                {option.label}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </th>
                                        <th>{t.leaderboard.columns.elo}</th>
                                        <th>{t.leaderboard.columns.record}</th>
                                        <th>
                                            <div className="dropdown dropdown-bottom">
                                                <label
                                                    tabIndex={0}
                                                    className="btn btn-ghost btn-xs gap-2 uppercase tracking-widest text-base-content/70"
                                                >
                                                    {winRateFilter === "ALL"
                                                        ? t.leaderboard.filters.winRateLabel
                                                        : t.leaderboard.filters.winRateAtLeast(Math.round(Number(winRateFilter) * 100))}
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                </label>
                                                <ul tabIndex={0} className="menu dropdown-content z-[1] mt-2 w-48 rounded-box border border-base-300 bg-base-100 p-2 shadow">
                                                    {winRateOptions.map((option) => (
                                                        <li key={option.value}>
                                                            <button type="button" onClick={() => setWinRateFilter(option.value)}>
                                                                {option.label}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeEntries.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-10">
                                                <div className="flex flex-col items-center gap-3 text-center">
                                                    <div className="text-4xl text-primary">[]</div>
                                                    <div className="text-lg font-black text-base-content">{t.leaderboard.emptyTitle}</div>
                                                    <div className="text-sm text-base-content/60">{t.leaderboard.emptySubtitle}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : activeTab === "players"
                                      ? players.map((entry) => {
                                              const displayName = entry.user.ign || entry.user.username || entry.user.fullName || t.common.userFallback;
                                              return (
                                                  <tr key={entry.user.id}>
                                                      <th className="font-semibold">
                                                          <div className="flex items-center gap-2">
                                                              <span className="tabular-nums">{entry.rank}</span>
                                                              {entry.rank <= 3 ? <Trophy className={`h-4 w-4 ${medalClass(entry.rank)}`} /> : null}
                                                          </div>
                                                      </th>
                                                      <td className="font-semibold">
                                                          <div className="flex flex-wrap items-center gap-2">
                                                              <Link href={`/leaderboard/players/${entry.user.id}${detailQuery}`} className="link link-hover">
                                                                  {displayName}
                                                              </Link>
                                                          </div>
                                                          <div className="mt-1 text-xs text-base-content/50">{entry.game.name}</div>
                                                      </td>
                                                      <td>
                                                          <span className={`badge badge-sm ${tierClass(entry.rankTier)}`}>
                                                              {entry.rankTier}
                                                          </span>
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
                                                  <th className="font-semibold">
                                                      <div className="flex items-center gap-2">
                                                          <span className="tabular-nums">{entry.rank}</span>
                                                          {entry.rank <= 3 ? <Trophy className={`h-4 w-4 ${medalClass(entry.rank)}`} /> : null}
                                                      </div>
                                                  </th>
                                                  <td className="font-semibold">
                                                      <div className="flex flex-wrap items-center gap-2">
                                                          <Link href={`/leaderboard/teams/${entry.team.id}${detailQuery}`} className="link link-hover">
                                                              {entry.team.name}
                                                          </Link>
                                                      </div>
                                                      <div className="mt-1 text-xs text-base-content/50">{entry.game.name}</div>
                                                  </td>
                                                  <td>
                                                      <span className={`badge badge-sm ${tierClass(entry.rankTier || "Bronze")}`}>
                                                          {entry.rankTier || "Bronze"}
                                                      </span>
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
                        {activeEntries.length > 0 ? (
                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-xs text-base-content/60 sm:text-sm">
                                    {t.leaderboard.showingLabel(activeEntries.length, total)}
                                </div>
                                <div className="join">
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm join-item"
                                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                                        disabled={page <= 1}
                                    >
                                        {t.leaderboard.prev}
                                    </button>
                                    <button type="button" className="btn btn-ghost btn-sm join-item pointer-events-none">
                                        {page} / {totalPages}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm join-item"
                                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                                        disabled={page >= totalPages}
                                    >
                                        {t.leaderboard.next}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </>
                )}
            </section>

            <Footer />

            <div className={`modal ${showInfo ? "modal-open" : ""}`}>
                <div className="modal-box max-w-2xl border border-base-300 bg-base-100">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black">{t.leaderboard.info.title}</h3>
                            <p className="mt-2 text-sm text-base-content/70">{t.leaderboard.info.description}</p>
                        </div>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowInfo(false)}>
                            {t.leaderboard.info.close}
                        </button>
                    </div>

                    <div className="mt-5 space-y-4 text-sm text-base-content/70">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/60">
                                {t.leaderboard.info.formulaTitle}
                            </div>
                            <div className="mt-2 rounded-box border border-base-300 bg-base-200/50 px-3 py-2 font-mono text-xs text-base-content">
                                {t.leaderboard.info.formulaBody}
                            </div>
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/60">
                                {t.leaderboard.info.termsTitle}
                            </div>
                            <ul className="mt-2 list-disc space-y-1 pl-4">
                                {t.leaderboard.info.termsItems.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/60">
                                {t.leaderboard.info.exampleTitle}
                            </div>
                            <p className="mt-2">{t.leaderboard.info.exampleBody}</p>
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/60">
                                {t.leaderboard.info.updateTitle}
                            </div>
                            <p className="mt-2">{t.leaderboard.info.updateBody}</p>
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/60">
                                {t.leaderboard.info.orderingTitle}
                            </div>
                            <p className="mt-2">{t.leaderboard.info.orderingBody}</p>
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/60">
                                {t.leaderboard.info.seasonTitle}
                            </div>
                            <p className="mt-2">{t.leaderboard.info.seasonBody}</p>
                        </div>
                        <div className="pt-2">
                            <Link href="/leaderboard/info" className="btn btn-outline btn-sm rounded-box">
                                {t.leaderboard.info.moreLink}
                            </Link>
                        </div>
                    </div>
                </div>
                <button className="modal-backdrop" onClick={() => setShowInfo(false)} aria-label={t.common.close} />
            </div>
        </main>
    );
}
