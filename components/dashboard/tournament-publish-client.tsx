"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";

type TournamentInfo = {
    title: string;
    status: string;
};

export function TournamentPublishClient({ tournamentId }: { tournamentId: string }) {
    const { success, error } = useToast();
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
                    error(data.message || "Gagal memuat data.");
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
                success("Status turnamen diperbarui.");
            } else {
                error(data.message || "Gagal mengubah status.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker="Publish"
                    title="Publikasi Turnamen"
                    description="Kontrol status publikasi dan akses halaman turnamen."
                    actions={
                        <Link href={`/tournaments/${tournamentId}`} className={btnOutline}>
                            Preview Public Page
                        </Link>
                    }
                />

                <DashboardPanel title="Status Publikasi" description="Gunakan status untuk mengontrol visibilitas.">
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <button className={btnPrimary} disabled={updating} onClick={() => updateStatus("OPEN")}>
                                Publish (OPEN)
                            </button>
                            <button className={btnOutline} disabled={updating} onClick={() => updateStatus("ONGOING")}>
                                Set Live (ONGOING)
                            </button>
                            <button className={btnOutline} disabled={updating} onClick={() => updateStatus("CANCELLED")}>
                                Archive (CANCELLED)
                            </button>
                        </div>
                        <div className="text-sm text-base-content/60">
                            Status saat ini: <span className="font-semibold">{tournament?.status ?? "..."}</span>
                        </div>
                    </div>
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
