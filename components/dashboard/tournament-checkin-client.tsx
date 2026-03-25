"use client";

import { useEffect, useState } from "react";
import { DashboardMetricCard, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";
import { DateTimePickerInput } from "@/components/ui/date-time-picker";
import { useLocale } from "@/hooks/use-locale";
import { formatDateTime } from "@/lib/i18n/format";

type SummaryResponse = {
    tournament: {
        checkInOpen: boolean;
        checkInAt: string | null;
        checkinRequired?: boolean;
    };
    stats: {
        registeredPlayers: number;
        checkedInPlayers: number;
    };
};

export function TournamentCheckInClient({ tournamentId }: { tournamentId: string }) {
    const { locale, t } = useLocale();
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
                    error(data.message || t.dashboard.checkIn.errors.loadFailed);
                }
            } catch {
                if (active) error(t.dashboard.checkIn.errors.network);
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
    const checkinRequired = summary?.tournament?.checkinRequired ?? false;

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
                    success(payload.action === "OPEN" ? t.dashboard.checkIn.success.opened : t.dashboard.checkIn.success.closed);
                } else {
                    success(payload.checkInAt ? t.dashboard.checkIn.success.scheduleUpdated : t.dashboard.checkIn.success.scheduleCleared);
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
                error(data.message || t.dashboard.checkIn.errors.updateFailed);
            }
        } catch {
            error(t.dashboard.checkIn.errors.network);
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

    const checkInStatus = checkinRequired
        ? summary?.tournament?.checkInOpen
            ? t.dashboard.checkIn.statusOpen
            : t.dashboard.checkIn.statusClosed
        : t.dashboard.checkIn.statusDisabled;
    const scheduleLabel = summary?.tournament?.checkInAt
        ? (() => {
              const date = new Date(summary.tournament.checkInAt);
              if (Number.isNaN(date.getTime())) {
                  return t.dashboard.checkIn.scheduleInvalid;
              }
              return t.dashboard.checkIn.scheduleSet(formatDateTime(date, locale, { dateStyle: "medium", timeStyle: "short" }));
          })()
        : t.dashboard.checkIn.scheduleEmpty;

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.checkIn.kicker}
                    title={t.dashboard.checkIn.title}
                    description={t.dashboard.checkIn.description}
                    actions={
                        <>
                            <button className={btnPrimary} disabled={updating || !checkinRequired || summary?.tournament?.checkInOpen} onClick={() => updateCheckIn({ action: "OPEN" })}>
                                {t.dashboard.checkIn.open}
                            </button>
                            <button className={btnOutline} disabled={updating || !checkinRequired || !summary?.tournament?.checkInOpen} onClick={() => updateCheckIn({ action: "CLOSE" })}>
                                {t.dashboard.checkIn.close}
                            </button>
                        </>
                    }
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <DashboardMetricCard label={t.dashboard.checkIn.registeredLabel} value={registered} />
                    <DashboardMetricCard label={t.dashboard.checkIn.checkedInLabel} value={checkedIn} meta={checkInStatus} />
                </div>

                <DashboardPanel title={t.dashboard.checkIn.panelTitle} description={t.dashboard.checkIn.panelDescription}>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/60">{t.dashboard.checkIn.scheduleLabel}</label>
                            <DateTimePickerInput
                                value={scheduleValue}
                                onChange={setScheduleValue}
                                disabled={updating || !checkinRequired}
                                className="w-full"
                            />
                            <p className="text-xs text-base-content/55">{scheduleLabel}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button className={btnPrimary} type="button" disabled={updating || !checkinRequired} onClick={handleScheduleSave}>
                                {t.dashboard.checkIn.saveSchedule}
                            </button>
                            <button className={btnOutline} type="button" disabled={updating || !checkinRequired || !summary?.tournament?.checkInAt} onClick={handleScheduleClear}>
                                {t.dashboard.checkIn.clearSchedule}
                            </button>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title={t.dashboard.checkIn.progressTitle} description={t.dashboard.checkIn.progressDescription}>
                    <div className="space-y-3">
                        <progress className="progress progress-primary w-full" value={progress} max={100} />
                        <div className="text-sm text-base-content/60">{t.dashboard.checkIn.progressText(progress)}</div>
                    </div>
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
