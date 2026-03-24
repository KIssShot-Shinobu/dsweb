"use client";

import { useEffect, useMemo, useState } from "react";
import { FormSelect } from "@/components/dashboard/form-select";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";
import { DateTimePickerInput } from "@/components/ui/date-time-picker";
import { DEFAULT_TIMEZONE, getTimeZoneOptions } from "@/lib/timezones";
import { formatLocalDateTimeInTimeZone } from "@/lib/datetime";

const GAME_OPTIONS = [
    { value: "DUEL_LINKS", label: "Duel Links" },
    { value: "MASTER_DUEL", label: "Master Duel" },
];

const FORMAT_OPTIONS = [
    { value: "BO1", label: "Best of 1" },
    { value: "BO3", label: "Best of 3" },
    { value: "BO5", label: "Best of 5" },
];

const STRUCTURE_OPTIONS = [
    { value: "SINGLE_ELIM", label: "Single Elimination" },
    { value: "DOUBLE_ELIM", label: "Double Elimination (Soon)" },
    { value: "SWISS", label: "Swiss (Soon)" },
];

const STATUS_OPTIONS = [
    { value: "OPEN", label: "OPEN" },
    { value: "ONGOING", label: "ONGOING" },
    { value: "COMPLETED", label: "COMPLETED" },
    { value: "CANCELLED", label: "CANCELLED" },
];

const FORFEIT_MODE_OPTIONS = [
    { value: "CHECKIN_ONLY", label: "Check-in only" },
    { value: "SCHEDULE_NO_SHOW", label: "No-show schedule" },
];

const formatIdrInput = (value: number) => new Intl.NumberFormat("id-ID").format(value);
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
    const { success, error } = useToast();
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
                    error(data.message || "Gagal memuat turnamen.");
                }
            } catch {
                if (active) error("Kesalahan jaringan.");
            } finally {
                if (active) setLoading(false);
            }
        };

        loadTournament();
        return () => {
            active = false;
            controller.abort();
        };
    }, [tournamentId, error]);

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
                success("Pengaturan turnamen diperbarui.");
            } else {
                error(data.message || "Gagal menyimpan pengaturan.");
            }
        } catch {
            error("Kesalahan jaringan.");
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
                    kicker="Settings"
                    title="Pengaturan Turnamen"
                    description="Ubah detail inti, format pertandingan, dan status turnamen."
                    actions={
                        <button className={btnPrimary} onClick={handleSubmit} disabled={saving || loading}>
                            {saving ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    }
                />

                <DashboardPanel title="Detail Turnamen" description="Informasi utama yang tampil di halaman publik.">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div>
                            <label className={labelCls}>Tournament Name</label>
                            <input className={inputCls} value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
                        </div>
                        <div>
                            <label className={labelCls}>Start Time</label>
                            <DateTimePickerInput
                                value={form.startAt}
                                onChange={(value) => setForm((prev) => ({ ...prev, startAt: value }))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Timezone</label>
                            <FormSelect value={form.timezone} onChange={(value) => setForm((prev) => ({ ...prev, timezone: value }))} options={timeZoneOptions} />
                            <p className="mt-1 text-xs text-base-content/55">Jadwal dan kalender mengikuti timezone ini.</p>
                        </div>
                        <div>
                            <label className={labelCls}>Registration Open</label>
                            <DateTimePickerInput
                                value={form.registrationOpen}
                                onChange={(value) => setForm((prev) => ({ ...prev, registrationOpen: value }))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Registration Close</label>
                            <DateTimePickerInput
                                value={form.registrationClose}
                                onChange={(value) => setForm((prev) => ({ ...prev, registrationClose: value }))}
                                className="w-full"
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <label className={labelCls}>Description</label>
                            <textarea className={`${inputCls} min-h-[140px] resize-y`} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title="Format & Status" description="Atur format pertandingan dan status saat ini.">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div>
                            <label className={labelCls}>Game</label>
                            <FormSelect value={form.gameType} onChange={(value) => setForm((prev) => ({ ...prev, gameType: value }))} options={GAME_OPTIONS} />
                        </div>
                        <div>
                            <label className={labelCls}>Match Format</label>
                            <FormSelect value={form.format} onChange={(value) => setForm((prev) => ({ ...prev, format: value }))} options={FORMAT_OPTIONS} />
                        </div>
                        <div>
                            <label className={labelCls}>Structure</label>
                            <FormSelect value={form.structure} onChange={(value) => setForm((prev) => ({ ...prev, structure: value }))} options={STRUCTURE_OPTIONS} />
                        </div>
                        <div>
                            <label className={labelCls}>Status</label>
                            <FormSelect value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} options={STATUS_OPTIONS} />
                        </div>
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            Check-in Required
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
                            <label className={labelCls}>{form.isTeamTournament ? "Max Teams" : "Max Players"}</label>
                            <input
                                type="number"
                                min={2}
                                step={1}
                                className={inputCls}
                                value={form.maxPlayers}
                                onChange={(event) => setForm((prev) => ({ ...prev, maxPlayers: event.target.value }))}
                                placeholder="Contoh: 32"
                            />
                            <p className="mt-2 text-xs text-base-content/45">
                                Bracket akan menyesuaikan ke ukuran power-of-two terdekat.
                            </p>
                        </div>
                        {form.isTeamTournament ? (
                            <div>
                                <label className={labelCls}>Lineup Size (opsional)</label>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    className={inputCls}
                                    value={form.lineupSize}
                                    onChange={(event) => setForm((prev) => ({ ...prev, lineupSize: event.target.value }))}
                                    placeholder="Contoh: 3"
                                />
                                <p className="mt-2 text-xs text-base-content/45">
                                    Captain akan submit lineup sebelum match dimulai.
                                </p>
                            </div>
                        ) : null}
                        <div>
                            <label className={labelCls}>Entry Fee (Rp)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className={inputCls}
                                value={form.entryFee ? formatIdrInput(form.entryFee) : ""}
                                onChange={(event) => setForm((prev) => ({ ...prev, entryFee: parseIdrInput(event.target.value) }))}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Prize Pool (Rp)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className={inputCls}
                                value={form.prizePool ? formatIdrInput(form.prizePool) : ""}
                                onChange={(event) => setForm((prev) => ({ ...prev, prizePool: parseIdrInput(event.target.value) }))}
                                placeholder="0"
                            />
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title="Auto Forfeit" description="Atur forfeit otomatis berdasarkan jadwal dan check-in.">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <label className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-3 py-3 text-sm font-semibold text-base-content">
                            Auto Forfeit
                            <input
                                type="checkbox"
                                className="toggle toggle-primary"
                                checked={form.forfeitEnabled}
                                disabled={!forfeitAvailable}
                                onChange={(event) => setForm((prev) => ({ ...prev, forfeitEnabled: event.target.checked }))}
                            />
                        </label>
                        <div>
                            <label className={labelCls}>Grace Minutes</label>
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
                            <label className={labelCls}>Mode</label>
                            <FormSelect
                                value={form.forfeitMode}
                                onChange={(value) => setForm((prev) => ({ ...prev, forfeitMode: value }))}
                                options={FORFEIT_MODE_OPTIONS}
                                disabled={!forfeitActive}
                            />
                        </div>
                        {!forfeitAvailable ? (
                            <p className="text-xs text-base-content/55 lg:col-span-3">
                                Aktifkan check-in untuk menggunakan auto-forfeit.
                            </p>
                        ) : null}
                    </div>
                </DashboardPanel>

                <div className="flex justify-end">
                    <button className={btnOutline} type="button" onClick={() => window.history.back()}>
                        Kembali
                    </button>
                </div>
            </div>
        </DashboardPageShell>
    );
}
