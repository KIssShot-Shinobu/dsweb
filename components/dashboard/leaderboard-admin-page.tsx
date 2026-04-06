"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import { useToast } from "@/components/dashboard/toast";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { formatDateTime } from "@/lib/i18n/format";

type SeasonOption = {
    id: string;
    name: string;
    startAt: string;
    endAt: string;
    isActive: boolean;
};

type SeasonResetResult = {
    newSeason: SeasonOption;
    archivedSeasonId: string | null;
    playersSeeded: number;
    teamsSeeded: number;
};

type SeasonFormState = {
    name: string;
    startAt: string;
    endAt: string;
};

const DEFAULT_DURATION_DAYS = 90;

const pad = (value: number) => String(value).padStart(2, "0");

const toLocalInput = (value: Date) => {
    const year = value.getFullYear();
    const month = pad(value.getMonth() + 1);
    const day = pad(value.getDate());
    const hours = pad(value.getHours());
    const minutes = pad(value.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function LeaderboardAdminPage() {
    const { t, locale } = useLocale();
    const { success, error, info } = useToast();
    const [seasons, setSeasons] = useState<SeasonOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [result, setResult] = useState<SeasonResetResult | null>(null);
    const [customDays, setCustomDays] = useState("");
    const [previewDays, setPreviewDays] = useState<number | null>(null);

    const [form, setForm] = useState<SeasonFormState>(() => {
        const now = new Date();
        const end = new Date(now.getTime() + DEFAULT_DURATION_DAYS * 24 * 60 * 60 * 1000);
        return {
            name: t.dashboard.leaderboardAdmin.defaults.name(now.getFullYear()),
            startAt: toLocalInput(now),
            endAt: toLocalInput(end),
        };
    });

    const loadSeasons = useCallback(() => {
        setLoading(true);
        let active = true;
        fetch("/api/leaderboard/seasons")
            .then((response) => response.json())
            .then((payload) => {
                if (!active) return;
                if (payload?.success) {
                    setSeasons(payload.data || []);
                } else {
                    setSeasons([]);
                }
            })
            .catch(() => {
                if (!active) return;
                setSeasons([]);
                error(t.dashboard.leaderboardAdmin.errors.loadFailed);
            })
            .finally(() => {
                if (!active) return;
                setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [error, t.dashboard.leaderboardAdmin.errors.loadFailed]);

    useEffect(() => {
        const cleanup = loadSeasons();
        return () => cleanup();
    }, [loadSeasons]);

    const activeSeason = useMemo(() => seasons.find((season) => season.isActive) || null, [seasons]);

    const isValid = useMemo(() => {
        if (!form.name.trim() || form.name.trim().length < 3) return false;
        if (!form.startAt || !form.endAt) return false;
        const start = new Date(form.startAt);
        const end = new Date(form.endAt);
        return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start;
    }, [form]);

    const resetForm = () => {
        const now = new Date();
        const end = new Date(now.getTime() + DEFAULT_DURATION_DAYS * 24 * 60 * 60 * 1000);
        setForm({
            name: t.dashboard.leaderboardAdmin.defaults.name(now.getFullYear()),
            startAt: toLocalInput(now),
            endAt: toLocalInput(end),
        });
    };

    const applyDurationDays = (days: number) => {
        const start = form.startAt ? new Date(form.startAt) : new Date();
        const startDate = Number.isNaN(start.getTime()) ? new Date() : start;
        const end = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
        setForm((prev) => ({
            ...prev,
            endAt: toLocalInput(end),
        }));
    };

    const parsedCustomDays = useMemo(() => {
        const parsed = Number.parseInt(customDays, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [customDays]);

    const previewDateLabel = useMemo(() => {
        const effectiveDays = previewDays ?? parsedCustomDays;
        if (!effectiveDays) return null;
        const start = form.startAt ? new Date(form.startAt) : new Date();
        const startDate = Number.isNaN(start.getTime()) ? new Date() : start;
        const end = new Date(startDate.getTime() + effectiveDays * 24 * 60 * 60 * 1000);
        return formatDateTime(end, locale, { day: "numeric", month: "short", year: "numeric" });
    }, [form.startAt, locale, parsedCustomDays, previewDays]);

    const applyCustomDays = () => {
        if (!parsedCustomDays) return;
        applyDurationDays(parsedCustomDays);
    };

    const handleSubmit = async () => {
        if (!isValid || submitting) return;
        setSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
                startAt: new Date(form.startAt).toISOString(),
                endAt: new Date(form.endAt).toISOString(),
            };

            const res = await fetch("/api/admin/leaderboard/season-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data?.success) {
                throw new Error(data?.message || t.dashboard.leaderboardAdmin.errors.resetFailed);
            }

            setResult(data.data);
            success(t.dashboard.leaderboardAdmin.success.reset);
            info(t.dashboard.leaderboardAdmin.success.seeded(data.data.playersSeeded, data.data.teamsSeeded));
            setConfirmOpen(false);
            loadSeasons();
        } catch (err) {
            error(err instanceof Error ? err.message : t.dashboard.leaderboardAdmin.errors.resetFailed);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.leaderboardAdmin.kicker}
                    title={t.dashboard.leaderboardAdmin.title}
                    description={t.dashboard.leaderboardAdmin.description}
                />

                <DashboardPanel
                    title={t.dashboard.leaderboardAdmin.panelTitle}
                    description={t.dashboard.leaderboardAdmin.panelDescription}
                    action={(
                        <button
                            type="button"
                            className={btnPrimary}
                            onClick={() => setConfirmOpen(true)}
                            disabled={!isValid || submitting}
                        >
                            {submitting ? t.dashboard.leaderboardAdmin.actions.resetting : t.dashboard.leaderboardAdmin.actions.reset}
                        </button>
                    )}
                >
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-4">
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/60">
                                    {t.dashboard.leaderboardAdmin.activeSeasonTitle}
                                </div>
                                {loading ? (
                                    <div className="mt-3 h-8 w-2/3 animate-pulse rounded-box bg-base-300/60" />
                                ) : activeSeason ? (
                                    <>
                                        <div className="mt-3 text-lg font-bold text-base-content">{activeSeason.name}</div>
                                        <div className="mt-1 text-xs text-base-content/60">
                                            {t.dashboard.leaderboardAdmin.activeSeasonDate(
                                                formatDateTime(activeSeason.startAt, locale, { day: "numeric", month: "short", year: "numeric" }),
                                                formatDateTime(activeSeason.endAt, locale, { day: "numeric", month: "short", year: "numeric" })
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="mt-3 text-sm text-base-content/60">
                                        {t.dashboard.leaderboardAdmin.activeSeasonNone}
                                    </div>
                                )}
                            </div>

                            {result ? (
                                <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/60">
                                        {t.dashboard.leaderboardAdmin.lastResetTitle}
                                    </div>
                                    <div className="mt-3 text-sm font-semibold text-base-content">
                                        {result.newSeason.name}
                                    </div>
                                    <div className="mt-2 text-xs text-base-content/60">
                                        {t.dashboard.leaderboardAdmin.lastResetMeta(result.playersSeeded, result.teamsSeeded)}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>{t.dashboard.leaderboardAdmin.fields.name}</label>
                                <input
                                    className={inputCls}
                                    value={form.name}
                                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                                    placeholder={t.dashboard.leaderboardAdmin.placeholders.name}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t.dashboard.leaderboardAdmin.fields.startAt}</label>
                                <input
                                    type="datetime-local"
                                    className={inputCls}
                                    value={form.startAt}
                                    onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t.dashboard.leaderboardAdmin.fields.endAt}</label>
                                <input
                                    type="datetime-local"
                                    className={inputCls}
                                    value={form.endAt}
                                    onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))}
                                />
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 px-4 py-3 text-xs text-base-content/60">
                                {t.dashboard.leaderboardAdmin.hints.timezone}
                            </div>
                            <div className="space-y-2">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/60">
                                    {t.dashboard.leaderboardAdmin.presets.title}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[60, 90, 120].map((days) => (
                                        <button
                                            key={days}
                                            type="button"
                                            className="btn btn-outline btn-sm rounded-box"
                                            onMouseEnter={() => setPreviewDays(days)}
                                            onMouseLeave={() => setPreviewDays(null)}
                                            onFocus={() => setPreviewDays(days)}
                                            onBlur={() => setPreviewDays(null)}
                                            onClick={() => applyDurationDays(days)}
                                        >
                                            {t.dashboard.leaderboardAdmin.presets.days(days)}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        className="input input-bordered input-sm w-24 bg-base-100"
                                        value={customDays}
                                        onChange={(event) => setCustomDays(event.target.value)}
                                        placeholder={t.dashboard.leaderboardAdmin.presets.customPlaceholder}
                                        aria-label={t.dashboard.leaderboardAdmin.presets.customLabel}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm rounded-box"
                                        onClick={applyCustomDays}
                                        disabled={!parsedCustomDays}
                                    >
                                        {t.dashboard.leaderboardAdmin.presets.applyCustom}
                                    </button>
                                </div>
                                {previewDateLabel ? (
                                    <div className="text-xs text-base-content/60">
                                        {t.dashboard.leaderboardAdmin.presets.preview(previewDateLabel)}
                                    </div>
                                ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" className={btnOutline} onClick={resetForm}>
                                    {t.dashboard.leaderboardAdmin.actions.fillDefaults}
                                </button>
                            </div>
                        </div>
                    </div>
                </DashboardPanel>
            </div>

            <ConfirmModal
                open={confirmOpen}
                title={t.dashboard.leaderboardAdmin.confirm.title}
                message={t.dashboard.leaderboardAdmin.confirm.message}
                confirmLabel={t.dashboard.leaderboardAdmin.actions.reset}
                cancelLabel={t.common.cancel}
                danger
                onConfirm={handleSubmit}
                onCancel={() => setConfirmOpen(false)}
            />
        </DashboardPageShell>
    );
}
