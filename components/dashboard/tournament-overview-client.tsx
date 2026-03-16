"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardMetricCard, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";

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
                    error(data.message || "Gagal memuat ringkasan turnamen.");
                }
            } catch {
                if (active) {
                    error("Kesalahan jaringan.");
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
    }, [tournamentId, error]);

    const handleStartTournament = async () => {
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/start`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                success("Bracket berhasil dibuat.");
            } else {
                error(data.message || "Gagal memulai turnamen.");
            }
        } catch {
            error("Kesalahan jaringan.");
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker="Overview"
                    title={summary?.tournament?.title || "Tournament Control Center"}
                    description="Pantau status turnamen, progres pertandingan, dan aksi cepat untuk admin."
                    actions={
                        <>
                            <button className={btnPrimary} onClick={handleStartTournament} disabled={summary?.tournament?.status !== "OPEN"}>
                                Start Tournament
                            </button>
                            <Link href={`/dashboard/tournaments/${tournamentId}/check-in`} className={btnOutline}>
                                Open Check-In
                            </Link>
                            <Link href={`/dashboard/tournaments/${tournamentId}/settings`} className={btnOutline}>
                                Edit Settings
                            </Link>
                        </>
                    }
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <DashboardMetricCard label="Registered Players" value={loading ? "..." : summary?.stats.registeredPlayers ?? 0} />
                    <DashboardMetricCard label="Checked-in Players" value={loading ? "..." : summary?.stats.checkedInPlayers ?? 0} meta="Check-in belum aktif" />
                    <DashboardMetricCard label="Matches Played" value={loading ? "..." : summary?.stats.matchesPlayed ?? 0} />
                    <DashboardMetricCard label="Matches Remaining" value={loading ? "..." : summary?.stats.matchesRemaining ?? 0} />
                </div>

                <DashboardPanel
                    title="Ringkasan Turnamen"
                    description="Informasi inti turnamen yang sedang berjalan."
                >
                    {summary ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">Game</div>
                                <div className="mt-2 text-base font-bold text-base-content">{summary.tournament.gameType}</div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">Start Date</div>
                                <div className="mt-2 text-base font-bold text-base-content">
                                    {new Date(summary.tournament.startAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                                </div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">Status</div>
                                <div className="mt-2 text-base font-bold text-base-content">{summary.tournament.status}</div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/50">Format</div>
                                <div className="mt-2 text-base font-bold text-base-content">
                                    {summary.tournament.structure} · {summary.tournament.format}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-base-content/60">Memuat data turnamen...</div>
                    )}
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
