"use client";

import { useEffect, useState } from "react";
import { DashboardMetricCard, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";

type SummaryResponse = {
    tournament: {
        checkInOpen: boolean;
        checkInAt: string | null;
    };
    stats: {
        registeredPlayers: number;
        checkedInPlayers: number;
    };
};

export function TournamentCheckInClient({ tournamentId }: { tournamentId: string }) {
    const { success, error } = useToast();
    const [summary, setSummary] = useState<SummaryResponse | null>(null);
    const [updating, setUpdating] = useState(false);
    const [scheduleValue, setScheduleValue] = useState("");

    useEffect(() => {
        let active = true;
        const controller = new AbortController();

        const loadSummary = async () => {
            try {
                const res = await fetch(`/api/tournaments/${tournamentId}/summary`, { signal: controller.signal });
                const data = await res.json();
                if (!active) return;
                if (res.ok) {
                    setSummary(data);
                } else {
                    error(data.message || "Gagal memuat check-in.");
                }
            } catch {
                if (active) error("Kesalahan jaringan.");
            }
        };

        loadSummary();
        return () => {
            active = false;
            controller.abort();
        };
    }, [tournamentId, error]);

    useEffect(() => {
        const value = summary?.tournament?.checkInAt;
        if (!value) {
            setScheduleValue("");
            return;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            setScheduleValue("");
            return;
        }
        const offsetMs = date.getTimezoneOffset() * 60000;
        setScheduleValue(new Date(date.getTime() - offsetMs).toISOString().slice(0, 16));
    }, [summary?.tournament?.checkInAt]);

    const registered = summary?.stats.registeredPlayers ?? 0;
    const checkedIn = summary?.stats.checkedInPlayers ?? 0;
    const progress = registered > 0 ? Math.round((checkedIn / registered) * 100) : 0;

    const updateCheckIn = async (payload: { action?: "OPEN" | "CLOSE"; checkInAt?: string }) => {
        setUpdating(true);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/check-in`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) {
                if (payload.action) {
                    success(payload.action === "OPEN" ? "Check-in dibuka." : "Check-in ditutup.");
                } else {
                    success(payload.checkInAt ? "Jadwal check-in diperbarui." : "Jadwal check-in dihapus.");
                }
                setSummary((prev) =>
                    prev
                        ? {
                              ...prev,
                              tournament: {
                                  ...prev.tournament,
                                  checkInOpen: data.tournament.checkInOpen,
                                  checkInAt: data.tournament.checkInAt ?? null,
                              },
                          }
                        : prev
                );
            } else {
                error(data.message || "Gagal memperbarui check-in.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setUpdating(false);
        }
    };

    const handleScheduleSave = async () => {
        await updateCheckIn({ checkInAt: scheduleValue });
    };

    const handleScheduleClear = async () => {
        await updateCheckIn({ checkInAt: "" });
    };

    const checkInStatus = summary?.tournament?.checkInOpen ? "Check-in sedang dibuka" : "Check-in belum dibuka";
    const scheduleLabel = summary?.tournament?.checkInAt
        ? (() => {
              const date = new Date(summary.tournament.checkInAt);
              if (Number.isNaN(date.getTime())) {
                  return "Jadwal tidak valid";
              }
              return `Dijadwalkan ${date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`;
          })()
        : "Belum ada jadwal";

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker="Check-In"
                    title="Kontrol Check-In"
                    description="Buka check-in dan pantau progres konfirmasi peserta."
                    actions={
                        <>
                            <button className={btnPrimary} disabled={updating || summary?.tournament?.checkInOpen} onClick={() => updateCheckIn({ action: "OPEN" })}>
                                Open Check-In
                            </button>
                            <button className={btnOutline} disabled={updating || !summary?.tournament?.checkInOpen} onClick={() => updateCheckIn({ action: "CLOSE" })}>
                                Close Check-In
                            </button>
                        </>
                    }
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <DashboardMetricCard label="Registered Players" value={registered} />
                    <DashboardMetricCard label="Checked-in Players" value={checkedIn} meta={checkInStatus} />
                </div>

                <DashboardPanel title="Jadwal Check-In" description="Atur waktu check-in agar peserta tahu kapan harus konfirmasi.">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/60">Waktu Check-In</label>
                            <input
                                type="datetime-local"
                                className="input input-bordered w-full"
                                value={scheduleValue}
                                onChange={(event) => setScheduleValue(event.target.value)}
                                disabled={updating}
                            />
                            <p className="text-xs text-base-content/55">{scheduleLabel}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button className={btnPrimary} type="button" disabled={updating} onClick={handleScheduleSave}>
                                Simpan Jadwal
                            </button>
                            <button className={btnOutline} type="button" disabled={updating || !summary?.tournament?.checkInAt} onClick={handleScheduleClear}>
                                Hapus Jadwal
                            </button>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title="Check-in Progress" description="Progres check-in akan tersedia setelah fitur diaktifkan.">
                    <div className="space-y-3">
                        <progress className="progress progress-primary w-full" value={progress} max={100} />
                        <div className="text-sm text-base-content/60">{progress}% peserta sudah check-in.</div>
                    </div>
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
