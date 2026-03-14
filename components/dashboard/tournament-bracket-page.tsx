"use client";

import { useEffect, useState } from "react";
import { TournamentBracketAdmin } from "@/components/dashboard/tournament-bracket-admin";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { useToast } from "@/components/dashboard/toast";

type TournamentStructure = "SINGLE_ELIM" | "DOUBLE_ELIM" | "SWISS";

export function TournamentBracketPage({ tournamentId }: { tournamentId: string }) {
    const { error } = useToast();
    const [structure, setStructure] = useState<TournamentStructure>("SINGLE_ELIM");
    const [title, setTitle] = useState("Bracket");
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
                    setTitle(data.tournament?.title ?? "Bracket");
                    setStatus(data.tournament?.status ?? "OPEN");
                } else {
                    error("Gagal memuat data turnamen.");
                }
            } catch {
                if (active) error("Kesalahan jaringan.");
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
                    kicker="Bracket"
                    title={`Bracket ${title}`}
                    description="Kelola hasil pertandingan langsung dari tampilan bracket."
                />
                <DashboardPanel title="Bracket View" description="Klik match untuk mengubah skor atau menentukan pemenang.">
                    <TournamentBracketAdmin tournamentId={tournamentId} structure={structure} status={status} />
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
