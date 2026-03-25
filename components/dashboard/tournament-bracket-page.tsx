"use client";

import { useEffect, useState } from "react";
import { TournamentBracketAdmin } from "@/components/dashboard/tournament-bracket-admin";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { useToast } from "@/components/dashboard/toast";
import { useLocale } from "@/hooks/use-locale";

type TournamentStructure = "SINGLE_ELIM" | "DOUBLE_ELIM" | "SWISS";

export function TournamentBracketPage({ tournamentId }: { tournamentId: string }) {
    const { error } = useToast();
    const { t } = useLocale();
    const [structure, setStructure] = useState<TournamentStructure>("SINGLE_ELIM");
    const [title, setTitle] = useState(t.dashboard.bracket.kicker);
    const [status, setStatus] = useState<"OPEN" | "ONGOING" | "COMPLETED" | "CANCELLED">("OPEN");

    useEffect(() => {
        let active = true;
        const controller = new AbortController();

        const loadTournament = async () => {
            try {
                const res = await fetch(`/api/tournaments/${tournamentId}`, { signal: controller.signal });
                const data = await res.json();
                if (!active) return;
                if (res.ok) {
                    setStructure(data.tournament?.structure ?? "SINGLE_ELIM");
                    setTitle(data.tournament?.title ?? t.dashboard.bracket.kicker);
                    setStatus(data.tournament?.status ?? "OPEN");
                } else {
                    error(t.dashboard.tournamentsAdmin.errors.loadFailed);
                }
            } catch {
                if (active) error(t.dashboard.tournamentsAdmin.errors.network);
            }
        };

        loadTournament();
        return () => {
            active = false;
            controller.abort();
        };
    }, [tournamentId, error]);

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.bracket.kicker}
                    title={`${t.dashboard.bracket.kicker} ${title}`}
                    description={t.dashboard.bracket.pageDescription}
                />
                <DashboardPanel title={t.dashboard.bracket.panelTitle} description={t.dashboard.bracket.panelDescription}>
                    <TournamentBracketAdmin tournamentId={tournamentId} structure={structure} status={status} />
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
