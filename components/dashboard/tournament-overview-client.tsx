"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardMetricCard, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";
import { useLocale } from "@/hooks/use-locale";
import { formatDateTime } from "@/lib/i18n/format";

type SummaryResponse = {
    tournament: {
        id: string;
        title: string;
        gameType: string;
        status: string;
        startAt: string;
        format: string;
        structure: string;
    };
    stats: {
        registeredPlayers: number;
        checkedInPlayers: number;
        matchesPlayed: number;
        matchesRemaining: number;
    };
};

export function TournamentOverviewClient({ tournamentId }: { tournamentId: string }) {
    const { t, locale } = useLocale();
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<SummaryResponse | null>(null);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();

        const loadSummary = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/tournaments/${tournamentId}/summary`, { signal: controller.signal });
                const data = await res.json();
                if (!active) return;
                if (res.ok) {
                    setSummary(data);
                } else {
                    error(data.message || t.dashboard.tournaments.overview.errors.loadFailed);
                }
            } catch {
                if (active) {
                    error(t.common.networkError);
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        loadSummary();
        return () => {
            active = false;
            controller.abort();
        };
    }, [tournamentId, error, t]);

    const handleStartTournament = async () => {
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/start`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                success(t.dashboard.tournaments.overview.success.bracketCreated);
            } else {
                error(data.message || t.dashboard.tournaments.overview.errors.startFailed);
            }
        } catch {
            error(t.common.networkError);
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.tournaments.overview.kicker}
                    title={summary?.tournament?.title || t.dashboard.tournaments.overview.titleFallback}
                    description={t.dashboard.tournaments.overview.description}
                    actions={
                        <>
                            <button className={btnPrimary} onClick={handleStartTournament} disabled={summary?.tournament?.status !== "OPEN"}>
                                {t.dashboard.tournaments.overview.startTournament}
                            </button>
                            <Link href={`/dashboard/tournaments/${tournamentId}/check-in`} className={btnOutline}>
                                {t.dashboard.tournaments.overview.openCheckIn}
                            </Link>
                            <Link href={`/dashboard/tournaments/${tournamentId}/settings`} className={btnOutline}>
                                {t.dashboard.tournaments.overview.editSettings}
                            </Link>
                        </>
                    }
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <DashboardMetricCard label={t.dashboard.tournaments.overview.metrics.registered} value={loading ? "..." : summary?.stats.registeredPlayers ?? 0} />
                    <DashboardMetricCard label={t.dashboard.tournaments.overview.metrics.checkedIn} value={loading ? "..." : summary?.stats.checkedInPlayers ?? 0} meta={t.dashboard.tournaments.overview.metrics.checkedInMeta} />
                    <DashboardMetricCard label={t.dashboard.tournaments.overview.metrics.played} value={loading ? "..." : summary?.stats.matchesPlayed ?? 0} />
                    <DashboardMetricCard label={t.dashboard.tournaments.overview.metrics.remaining} value={loading ? "..." : summary?.stats.matchesRemaining ?? 0} />
                </div>

                <DashboardPanel
                    title={t.dashboard.tournaments.overview.panelTitle}
                    description={t.dashboard.tournaments.overview.panelDescription}
                >
                    {summary ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">{t.dashboard.tournaments.overview.labels.game}</div>
                                <div className="mt-2 text-base font-bold text-base-content">{summary.tournament.gameType}</div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">{t.dashboard.tournaments.overview.labels.startDate}</div>
                                <div className="mt-2 text-base font-bold text-base-content">
                                    {formatDateTime(summary.tournament.startAt, locale, { dateStyle: "medium", timeStyle: "short" })}
                                </div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">{t.dashboard.tournaments.overview.labels.status}</div>
                                <div className="mt-2 text-base font-bold text-base-content">{summary.tournament.status}</div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">{t.dashboard.tournaments.overview.labels.format}</div>
                                <div className="mt-2 text-base font-bold text-base-content">
                                    {summary.tournament.structure} · {summary.tournament.format}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-base-content/60">{t.dashboard.tournaments.overview.loading}</div>
                    )}
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
