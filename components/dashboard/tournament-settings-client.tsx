"use client";

import { useEffect, useState } from "react";
import { FormSelect } from "@/components/dashboard/form-select";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";

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

const MAX_PLAYERS_OPTIONS = [
    { value: "", label: "Tanpa batas" },
    { value: "8", label: "8 pemain" },
    { value: "16", label: "16 pemain" },
    { value: "32", label: "32 pemain" },
    { value: "64", label: "64 pemain" },
    { value: "128", label: "128 pemain" },
    { value: "256", label: "256 pemain" },
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
    checkinRequired: boolean;
    entryFee: number;
    prizePool: number;
    status: string;
    maxPlayers: string;
};

export function TournamentSettingsClient({ tournamentId }: { tournamentId: string }) {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<TournamentForm>({
        title: "",
        description: "",
        gameType: "DUEL_LINKS",
        format: "BO3",
        structure: "SINGLE_ELIM",
        startAt: "",
        registrationOpen: "",
        registrationClose: "",
        checkinRequired: false,
        entryFee: 0,
        prizePool: 0,
        status: "OPEN",
        maxPlayers: "",
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
                    setForm({
                        title: tournament.title,
                        description: tournament.description ?? "",
                        gameType: tournament.gameType,
                        format: tournament.format,
                        structure: tournament.structure ?? "SINGLE_ELIM",
                        startAt: new Date(tournament.startAt).toISOString().slice(0, 16),
                        registrationOpen: tournament.registrationOpen ? new Date(tournament.registrationOpen).toISOString().slice(0, 16) : "",
                        registrationClose: tournament.registrationClose ? new Date(tournament.registrationClose).toISOString().slice(0, 16) : "",
                        checkinRequired: Boolean(tournament.checkinRequired),
                        entryFee: tournament.entryFee ?? 0,
                        prizePool: tournament.prizePool ?? 0,
                        status: tournament.status,
                        maxPlayers: tournament.maxPlayers ? String(tournament.maxPlayers) : "",
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
                    checkinRequired: form.checkinRequired,
                    entryFee: form.entryFee,
                    prizePool: form.prizePool,
                    status: form.status,
                    maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : undefined,
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
                            <input type="datetime-local" className={inputCls} value={form.startAt} onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))} />
                        </div>
                        <div>
                            <label className={labelCls}>Registration Open</label>
                            <input type="datetime-local" className={inputCls} value={form.registrationOpen} onChange={(event) => setForm((prev) => ({ ...prev, registrationOpen: event.target.value }))} />
                        </div>
                        <div>
                            <label className={labelCls}>Registration Close</label>
                            <input type="datetime-local" className={inputCls} value={form.registrationClose} onChange={(event) => setForm((prev) => ({ ...prev, registrationClose: event.target.value }))} />
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
                            <input type="checkbox" className="toggle toggle-primary" checked={form.checkinRequired} onChange={(event) => setForm((prev) => ({ ...prev, checkinRequired: event.target.checked }))} />
                        </label>
                        <div>
                            <label className={labelCls}>Max Players</label>
                            <FormSelect value={form.maxPlayers} onChange={(value) => setForm((prev) => ({ ...prev, maxPlayers: value }))} options={MAX_PLAYERS_OPTIONS} />
                        </div>
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

                <div className="flex justify-end">
                    <button className={btnOutline} type="button" onClick={() => window.history.back()}>
                        Kembali
                    </button>
                </div>
            </div>
        </DashboardPageShell>
    );
}
