"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";
import { useLocale } from "@/hooks/use-locale";

type TournamentInfo = {
    title: string;
    status: string;
};

export function TournamentPublishClient({ tournamentId }: { tournamentId: string }) {
    const { success, error } = useToast();
    const { t } = useLocale();
    const [tournament, setTournament] = useState<TournamentInfo | null>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();

        const loadTournament = async () => {
            try {
                const res = await fetch(`/api/tournaments/${tournamentId}`, { signal: controller.signal });
                const data = await res.json();
                if (!active) return;
                if (res.ok) {
                    setTournament({ title: data.tournament.title, status: data.tournament.status });
                } else {
                    error(data.message || t.dashboard.publish.errors.loadFailed);
                }
            } catch {
                if (active) error(t.dashboard.publish.errors.network);
            }
        };

        loadTournament();
        return () => {
            active = false;
            controller.abort();
        };
    }, [tournamentId, error]);

    const updateStatus = async (status: string) => {
        setUpdating(true);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (res.ok) {
                setTournament((prev) => (prev ? { ...prev, status } : prev));
                success(t.dashboard.publish.success.updated);
            } else {
                error(data.message || t.dashboard.publish.errors.updateFailed);
            }
        } catch {
            error(t.dashboard.publish.errors.network);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.publish.kicker}
                    title={t.dashboard.publish.title}
                    description={t.dashboard.publish.description}
                    actions={
                        <Link href={`/tournaments/${tournamentId}`} className={btnOutline}>
                            {t.dashboard.publish.preview}
                        </Link>
                    }
                />

                <DashboardPanel title={t.dashboard.publish.panelTitle} description={t.dashboard.publish.panelDescription}>
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <button className={btnPrimary} disabled={updating} onClick={() => updateStatus("OPEN")}>
                                {t.dashboard.publish.publishOpen}
                            </button>
                            <button className={btnOutline} disabled={updating} onClick={() => updateStatus("ONGOING")}>
                                {t.dashboard.publish.setLive}
                            </button>
                            <button className={btnOutline} disabled={updating} onClick={() => updateStatus("CANCELLED")}>
                                {t.dashboard.publish.archive}
                            </button>
                        </div>
                        <div className="text-sm text-base-content/60">
                            {t.dashboard.publish.currentStatus}: <span className="font-semibold">{tournament?.status ?? "..."}</span>
                        </div>
                    </div>
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
