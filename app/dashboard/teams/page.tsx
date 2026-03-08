"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
    btnDanger,
    btnOutline,
    btnPrimary,
    filterBarCls,
    inputCls,
    labelCls,
    searchInputCls,
} from "@/components/dashboard/form-styles";
import {
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { FormSelect } from "@/components/dashboard/form-select";

interface TeamRow {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    isActive: boolean;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
}

const STATUS_OPTIONS = [
    { value: "ALL", label: "Semua Team" },
    { value: "ACTIVE", label: "Aktif" },
    { value: "INACTIVE", label: "Nonaktif" },
];

const emptyForm = {
    name: "",
    slug: "",
    description: "",
    logoUrl: "",
    isActive: true,
};

export default function TeamsPage() {
    const { user } = useCurrentUser();
    const [teams, setTeams] = useState<TeamRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("ALL");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = ["ADMIN", "FOUNDER"].includes(user?.role || "");

    const fetchTeams = () => {
        setLoading(true);
        const params = new URLSearchParams({ search, status });
        fetch(`/api/teams?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                setTeams(data.data || []);
            })
            .catch(() => setError("Gagal memuat daftar team"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchTeams();
    }, [search, status]);

    const resetModal = () => {
        setModalOpen(false);
        setEditingTeam(null);
        setForm(emptyForm);
    };

    const openCreate = () => {
        setError(null);
        setMessage(null);
        setEditingTeam(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (team: TeamRow) => {
        setError(null);
        setMessage(null);
        setEditingTeam(team);
        setForm({
            name: team.name,
            slug: team.slug,
            description: team.description || "",
            logoUrl: team.logoUrl || "",
            isActive: team.isActive,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        setMessage(null);

        const method = editingTeam ? "PUT" : "POST";
        const url = editingTeam ? `/api/teams/${editingTeam.id}` : "/api/teams";

        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        const data = await response.json();

        if (!response.ok) {
            setError(data.message || "Gagal menyimpan team");
            setSaving(false);
            return;
        }

        setSaving(false);
        setMessage(editingTeam ? "Perubahan team berhasil disimpan." : "Team baru berhasil dibuat.");
        resetModal();
        fetchTeams();
    };

    const handleDelete = async (team: TeamRow) => {
        if (!confirm(`Hapus team ${team.name}?`)) return;

        setError(null);
        setMessage(null);
        const response = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
        const data = await response.json();

        if (!response.ok) {
            setError(data.message || "Gagal menghapus team");
            return;
        }

        setMessage(`Team ${team.name} berhasil dihapus.`);
        fetchTeams();
    };

    const activeTeams = teams.filter((team) => team.isActive).length;
    const totalAssignedMembers = teams.reduce((sum, team) => sum + team.memberCount, 0);
    const avgRoster = teams.length ? Math.round(totalAssignedMembers / teams.length) : 0;

    const helperText = useMemo(
        () =>
            isAdmin
                ? "Role MEMBER ke atas bisa dihubungkan ke team. User publik tetap bisa aktif tanpa team."
                : "Halaman ini menampilkan struktur team Duel Standby dan roster aktif yang sudah ditetapkan admin.",
        [isAdmin]
    );

    return (
        <DashboardPageShell>
            <div className="space-y-5 lg:space-y-6">
                <DashboardPageHeader
                    kicker="Guild Teams"
                    title="Teams"
                    description="Kelola roster Duel Standby tanpa mencampur status member komunitas dengan afiliasi team."
                    actions={isAdmin ? <button onClick={openCreate} className={btnPrimary}>Buat Team</button> : null}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <DashboardMetricCard label="Total Teams" value={loading ? "..." : teams.length} meta="Seluruh team yang tersedia di Duel Standby" tone="accent" />
                    <DashboardMetricCard label="Teams Aktif" value={loading ? "..." : activeTeams} meta="Team yang masih bisa dipakai untuk roster aktif" tone="success" />
                    <DashboardMetricCard label="Avg. Roster" value={loading ? "..." : avgRoster} meta={helperText} tone="default" />
                </div>

                {message ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-500">
                        {message}
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500">
                        {error}
                    </div>
                ) : null}

                <DashboardPanel title="Filter Team" description="Cari team berdasarkan nama, slug, atau status aktif roster.">
                    <div className={filterBarCls}>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari nama atau slug team..."
                                className={searchInputCls}
                            />
                            <FormSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} className="w-full" />
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title="Roster Team" description="Buka detail team untuk melihat roster lengkap dan mengatur assignment anggota dengan lebih nyaman.">
                    {loading ? (
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item} className="h-44 animate-pulse rounded-2xl border border-black/5 bg-slate-100/90 dark:border-white/6 dark:bg-white/[0.04]" />
                            ))}
                        </div>
                    ) : teams.length === 0 ? (
                        <DashboardEmptyState
                            title="Belum ada team"
                            description="Buat struktur team dulu, lalu hubungkan member Duel Standby dari halaman detail team atau halaman Users."
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                            {teams.map((team) => (
                                <article key={team.id} className="rounded-2xl border border-black/5 bg-slate-50/80 p-4 transition-all hover:bg-white dark:border-white/6 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-lg font-bold text-slate-950 dark:text-white">{team.name}</h3>
                                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${team.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" : "border-slate-200/80 text-slate-500 dark:border-white/10 dark:text-white/45"}`}>
                                                    {team.isActive ? "Aktif" : "Nonaktif"}
                                                </span>
                                            </div>
                                            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">/{team.slug}</div>
                                            <p className="text-sm leading-6 text-slate-500 dark:text-white/45">
                                                {team.description || "Belum ada deskripsi team. Tambahkan deskripsi singkat agar admin lain cepat mengenali roster ini."}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-ds-amber/20 bg-ds-amber/10 px-3 py-2 text-right">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ds-amber/80">Roster</div>
                                            <div className="mt-1 text-2xl font-black text-ds-amber">{team.memberCount}</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-white/35">
                                        <span>Dibuat {new Date(team.createdAt).toLocaleDateString("id-ID")}</span>
                                        <span>|</span>
                                        <span>Diperbarui {new Date(team.updatedAt).toLocaleDateString("id-ID")}</span>
                                    </div>

                                    <div className="mt-5 flex flex-wrap gap-2">
                                        <Link href={`/dashboard/teams/${team.id}`} className={btnPrimary}>
                                            Buka Detail
                                        </Link>
                                        {isAdmin ? (
                                            <button onClick={() => openEdit(team)} className={btnOutline}>Edit Team</button>
                                        ) : null}
                                        {isAdmin ? (
                                            <button onClick={() => handleDelete(team)} className={btnDanger} disabled={team.memberCount > 0}>
                                                Hapus Team
                                            </button>
                                        ) : null}
                                        {team.memberCount > 0 ? (
                                            <span className="self-center text-[11px] text-slate-400 dark:text-white/35">Kosongkan roster dari detail team sebelum hapus.</span>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </DashboardPanel>
            </div>

            {modalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetModal} />
                    <div className="relative w-full max-w-2xl rounded-3xl border border-black/5 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                                {editingTeam ? "Edit Team" : "Buat Team Baru"}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-white/45">
                                Team hanya memetakan roster Duel Standby. Role komunitas MEMBER tidak otomatis berarti sudah punya team.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="block">
                                    <span className={labelCls}>Nama Team</span>
                                    <input
                                        value={form.name}
                                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                        className={inputCls}
                                        placeholder="Contoh: Duel Standby Alpha"
                                        required
                                    />
                                </label>
                                <label className="block">
                                    <span className={labelCls}>Slug Team</span>
                                    <input
                                        value={form.slug}
                                        onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                                        className={inputCls}
                                        placeholder="duel-standby-alpha"
                                        required
                                    />
                                </label>
                            </div>

                            <label className="block">
                                <span className={labelCls}>Deskripsi</span>
                                <textarea
                                    value={form.description}
                                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                    rows={4}
                                    className={`${inputCls} resize-none`}
                                    placeholder="Ringkasan singkat fokus roster atau identitas team."
                                />
                            </label>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                                <label className="block">
                                    <span className={labelCls}>Logo Lokal</span>
                                    <input
                                        value={form.logoUrl}
                                        onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
                                        className={inputCls}
                                        placeholder="/uploads/logo-team.jpg"
                                    />
                                </label>
                                <label className="block">
                                    <span className={labelCls}>Status Team</span>
                                    <FormSelect
                                        value={form.isActive ? "ACTIVE" : "INACTIVE"}
                                        onChange={(value) => setForm((current) => ({ ...current, isActive: value === "ACTIVE" }))}
                                        options={STATUS_OPTIONS.filter((option) => option.value !== "ALL")}
                                        className="w-full"
                                    />
                                </label>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <button type="button" onClick={resetModal} className={btnOutline}>Batal</button>
                                <button type="submit" className={btnPrimary} disabled={saving}>
                                    {saving ? "Menyimpan..." : editingTeam ? "Simpan Perubahan" : "Buat Team"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </DashboardPageShell>
    );
}