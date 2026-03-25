"use client";

import { useEffect, useMemo, useState } from "react";
import { FormSelect } from "@/components/dashboard/form-select";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";
import { DateTimePickerInput } from "@/components/ui/date-time-picker";
import { DEFAULT_TIMEZONE, getTimeZoneOptions } from "@/lib/timezones";
import { formatLocalDateTimeInTimeZone } from "@/lib/datetime";
import { useLocale } from "@/hooks/use-locale";
import { getIntlLocale } from "@/lib/i18n/format";
import { useGames } from "@/hooks/use-games";

const parseIdrInput = (value: string) => {
    const numeric = Number(value.replace(/[^0-9]/g, ""));
    return Number.isNaN(numeric) ? 0 : numeric;
};

type TournamentForm = {
    title: string;
    description: string;
    gameType: string;
    format: string;
    structure: string;
    startAt: string;
    registrationOpen: string;
    registrationClose: string;
    timezone: string;
    checkinRequired: boolean;
    forfeitEnabled: boolean;
    forfeitGraceMinutes: number;
    forfeitMode: string;
    entryFee: number;
    prizePool: number;
    status: string;
    maxPlayers: string;
    isTeamTournament: boolean;
    lineupSize: string;
};

export function TournamentSettingsClient({ tournamentId }: { tournamentId: string }) {
    const { t, locale } = useLocale();
    const { success, error } = useToast();
    const { games, loading: gamesLoading } = useGames({ scope: "admin" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);
    const [form, setForm] = useState<TournamentForm>({
        title: "",
        description: "",
        gameType: "DUEL_LINKS",
        format: "BO3",
        structure: "SINGLE_ELIM",
        startAt: "",
        registrationOpen: "",
        registrationClose: "",
        timezone: DEFAULT_TIMEZONE,
        checkinRequired: false,
        forfeitEnabled: false,
        forfeitGraceMinutes: 15,
        forfeitMode: "CHECKIN_ONLY",
        entryFee: 0,
        prizePool: 0,
        status: "OPEN",
        maxPlayers: "",
        isTeamTournament: false,
        lineupSize: "",
    });
    const formatIdrInput = (value: number) => new Intl.NumberFormat(getIntlLocale(locale)).format(value);
    const gameOptions = useMemo(() => {
        const mapped = games.map((game) => ({ value: game.code, label: game.name }));
        if (form.gameType && !mapped.some((option) => option.value === form.gameType)) {
            mapped.unshift({ value: form.gameType, label: form.gameType });
        }
        if (mapped.length === 0) {
            return [{ value: "", label: t.dashboard.games.emptyOption }];
        }
        return mapped;
    }, [form.gameType, games, t.dashboard.games.emptyOption]);

    const selectOptions = useMemo(() => {
        const options = t.dashboard.tournamentOptions;
        return {
            gameType: gameOptions,
            format: [
                { value: "BO1", label: options.format.bo1 },
                { value: "BO3", label: options.format.bo3 },
                { value: "BO5", label: options.format.bo5 },
            ],
            structure: [
                { value: "SINGLE_ELIM", label: options.structure.singleElim },
                { value: "DOUBLE_ELIM", label: options.structure.doubleElim },
                { value: "SWISS", label: options.structure.swiss },
            ],
            status: [
                { value: "OPEN", label: options.status.open },
                { value: "ONGOING", label: options.status.ongoing },
                { value: "COMPLETED", label: options.status.completed },
                { value: "CANCELLED", label: options.status.cancelled },
            ],
            forfeitMode: [
                { value: "CHECKIN_ONLY", label: options.forfeitMode.checkinOnly },
                { value: "SCHEDULE_NO_SHOW", label: options.forfeitMode.scheduleNoShow },
            ],
        };
    }, [gameOptions, t]);

    useEffect(() => {
        if (!form.gameType && games.length > 0) {
            setForm((prev) => ({ ...prev, gameType: games[0].code }));
        }
    }, [form.gameType, games]);

    const gameSelectDisabled = gamesLoading || gameOptions.length === 0 || gameOptions[0].value === "";

    useEffect(() => {
        let active = true;
        const controller = new AbortController();

        const loadTournament = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/tournaments/${tournamentId}`, { signal: controller.signal });
                const data = await res.json();
                if (!active) return;
                if (res.ok) {
                    const tournament = data.tournament;
                    const timeZone = tournament.timezone || DEFAULT_TIMEZONE;
                    setForm({
                        title: tournament.title,
                        description: tournament.description ?? "",
                        gameType: tournament.gameType,
                        format: tournament.format,
                        structure: tournament.structure ?? "SINGLE_ELIM",
                        startAt: formatLocalDateTimeInTimeZone(new Date(tournament.startAt), timeZone),
                        registrationOpen: tournament.registrationOpen ? formatLocalDateTimeInTimeZone(new Date(tournament.registrationOpen), timeZone) : "",
                        registrationClose: tournament.registrationClose ? formatLocalDateTimeInTimeZone(new Date(tournament.registrationClose), timeZone) : "",
                        timezone: timeZone,
                        checkinRequired: Boolean(tournament.checkinRequired),
                        forfeitEnabled: Boolean(tournament.forfeitEnabled),
                        forfeitGraceMinutes: tournament.forfeitGraceMinutes ?? 15,
                        forfeitMode: tournament.forfeitMode ?? "CHECKIN_ONLY",
                        entryFee: tournament.entryFee ?? 0,
                        prizePool: tournament.prizePool ?? 0,
                        status: tournament.status,
                        maxPlayers: tournament.maxPlayers ? String(tournament.maxPlayers) : "",
                        isTeamTournament: Boolean(tournament.isTeamTournament || (tournament.mode && tournament.mode !== "INDIVIDUAL")),
                        lineupSize: tournament.lineupSize ? String(tournament.lineupSize) : "",
                    });
                } else {
                    error(data.message || t.dashboard.tournamentSettings.errors.loadFailed);
                }
            } catch {
                if (active) error(t.common.networkError);
            } finally {
                if (active) setLoading(false);
            }
        };

        loadTournament();
        return () => {
            active = false;
            controller.abort();
        };
    }, [t, tournamentId, error]);

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    gameType: form.gameType,
                    format: form.format,
                    structure: form.structure,
                    startAt: form.startAt,
                    registrationOpen: form.registrationOpen || undefined,
                    registrationClose: form.registrationClose || undefined,
                    timezone: form.timezone,
                    checkinRequired: form.checkinRequired,
                    forfeitEnabled: form.forfeitEnabled,
                    forfeitGraceMinutes: form.forfeitGraceMinutes,
                    forfeitMode: form.forfeitMode,
                    entryFee: form.entryFee,
                    prizePool: form.prizePool,
                    status: form.status,
                    maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : undefined,
                    lineupSize: form.isTeamTournament ? (form.lineupSize ? Number(form.lineupSize) : null) : null,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                success(t.dashboard.tournamentSettings.success.saved);
            } else {
                error(data.message || t.dashboard.tournamentSettings.errors.saveFailed);
            }
        } catch {
            error(t.common.networkError);
        } finally {
            setSaving(false);
        }
    };

    const forfeitAvailable = form.checkinRequired;
    const forfeitActive = forfeitAvailable && form.forfeitEnabled;

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.tournamentSettings.kicker}
                    title={t.dashboard.tournamentSettings.title}
                    description={t.dashboard.tournamentSettings.description}
                    actions={
                        <button className={btnPrimary} onClick={handleSubmit} disabled={saving || loading}>
                            {saving ? t.dashboard.tournamentSettings.actions.saving : t.dashboard.tournamentSettings.actions.save}
                        </button>
                    }
                />

                <DashboardPanel
                    title={t.dashboard.tournamentSettings.panels.detailsTitle}
                    description={t.dashboard.tournamentSettings.panels.detailsDescription}
                >
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.tournamentName}</label>
                            <input className={inputCls} value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.startTime}</label>
                            <DateTimePickerInput
                                value={form.startAt}
                                onChange={(value) => setForm((prev) => ({ ...prev, startAt: value }))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.timezone}</label>
                            <FormSelect value={form.timezone} onChange={(value) => setForm((prev) => ({ ...prev, timezone: value }))} options={timeZoneOptions} />
                            <p className="mt-1 text-xs text-base-content/55">{t.dashboard.tournamentSettings.hints.timezone}</p>
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.registrationOpen}</label>
                            <DateTimePickerInput
                                value={form.registrationOpen}
                                onChange={(value) => setForm((prev) => ({ ...prev, registrationOpen: value }))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.registrationClose}</label>
                            <DateTimePickerInput
                                value={form.registrationClose}
                                onChange={(value) => setForm((prev) => ({ ...prev, registrationClose: value }))}
                                className="w-full"
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.description}</label>
                            <textarea className={`${inputCls} min-h-[140px] resize-y`} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel
                    title={t.dashboard.tournamentSettings.panels.formatTitle}
                    description={t.dashboard.tournamentSettings.panels.formatDescription}
                >
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.game}</label>
                            <FormSelect
                                value={form.gameType}
                                onChange={(value) => setForm((prev) => ({ ...prev, gameType: value }))}
                                options={selectOptions.gameType}
                                disabled={gameSelectDisabled}
                            />
                            {gameSelectDisabled ? (
                                <p className="mt-2 text-xs text-base-content/55">{t.dashboard.tournamentSettings.hints.gameUnavailable}</p>
                            ) : null}
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.matchFormat}</label>
                            <FormSelect value={form.format} onChange={(value) => setForm((prev) => ({ ...prev, format: value }))} options={selectOptions.format} />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.structure}</label>
                            <FormSelect value={form.structure} onChange={(value) => setForm((prev) => ({ ...prev, structure: value }))} options={selectOptions.structure} />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.status}</label>
                            <FormSelect value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} options={selectOptions.status} />
                        </div>
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            {t.dashboard.tournamentSettings.fields.checkinRequired}
                            <input
                                type="checkbox"
                                className="toggle toggle-primary"
                                checked={form.checkinRequired}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        checkinRequired: event.target.checked,
                                        forfeitEnabled: event.target.checked ? prev.forfeitEnabled : false,
                                    }))
                                }
                            />
                        </label>
                        <div>
                            <label className={labelCls}>
                                {form.isTeamTournament ? t.dashboard.tournamentSettings.fields.maxTeams : t.dashboard.tournamentSettings.fields.maxPlayers}
                            </label>
                            <input
                                type="number"
                                min={2}
                                step={1}
                                className={inputCls}
                                value={form.maxPlayers}
                                onChange={(event) => setForm((prev) => ({ ...prev, maxPlayers: event.target.value }))}
                                placeholder={t.dashboard.tournamentSettings.placeholders.maxPlayers}
                            />
                            <p className="mt-2 text-xs text-base-content/45">
                                {t.dashboard.tournamentSettings.hints.bracketSize}
                            </p>
                        </div>
                        {form.isTeamTournament ? (
                            <div>
                                <label className={labelCls}>{t.dashboard.tournamentSettings.fields.lineupSizeOptional}</label>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    className={inputCls}
                                    value={form.lineupSize}
                                    onChange={(event) => setForm((prev) => ({ ...prev, lineupSize: event.target.value }))}
                                    placeholder={t.dashboard.tournamentSettings.placeholders.lineupSize}
                                />
                                <p className="mt-2 text-xs text-base-content/45">
                                    {t.dashboard.tournamentSettings.hints.lineup}
                                </p>
                            </div>
                        ) : null}
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.entryFee}</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className={inputCls}
                                value={form.entryFee ? formatIdrInput(form.entryFee) : ""}
                                onChange={(event) => setForm((prev) => ({ ...prev, entryFee: parseIdrInput(event.target.value) }))}
                                placeholder={t.dashboard.tournamentSettings.placeholders.entryFee}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.prizePool}</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className={inputCls}
                                value={form.prizePool ? formatIdrInput(form.prizePool) : ""}
                                onChange={(event) => setForm((prev) => ({ ...prev, prizePool: parseIdrInput(event.target.value) }))}
                                placeholder={t.dashboard.tournamentSettings.placeholders.prizePool}
                            />
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel
                    title={t.dashboard.tournamentSettings.panels.forfeitTitle}
                    description={t.dashboard.tournamentSettings.panels.forfeitDescription}
                >
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            {t.dashboard.tournamentSettings.fields.autoForfeit}
                            <input
                                type="checkbox"
                                className="toggle toggle-primary"
                                checked={form.forfeitEnabled}
                                disabled={!forfeitAvailable}
                                onChange={(event) => setForm((prev) => ({ ...prev, forfeitEnabled: event.target.checked }))}
                            />
                        </label>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.graceMinutes}</label>
                            <input
                                type="number"
                                min={1}
                                className={inputCls}
                                value={form.forfeitGraceMinutes}
                                onChange={(event) => setForm((prev) => ({ ...prev, forfeitGraceMinutes: Number(event.target.value) }))}
                                disabled={!forfeitActive}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.tournamentSettings.fields.mode}</label>
                            <FormSelect
                                value={form.forfeitMode}
                                onChange={(value) => setForm((prev) => ({ ...prev, forfeitMode: value }))}
                                options={selectOptions.forfeitMode}
                                disabled={!forfeitActive}
                            />
                        </div>
                        {!forfeitAvailable ? (
                            <p className="text-xs text-base-content/55 lg:col-span-3">
                                {t.dashboard.tournamentSettings.hints.forfeitUnavailable}
                            </p>
                        ) : null}
                    </div>
                </DashboardPanel>

                <div className="flex justify-end">
                    <button className={btnOutline} type="button" onClick={() => window.history.back()}>
                        {t.dashboard.tournamentSettings.buttons.back}
                    </button>
                </div>
            </div>
        </DashboardPageShell>
    );
}
