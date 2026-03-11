"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
    const [teamToDelete, setTeamToDelete] = useState<TeamRow | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = ["ADMIN", "FOUNDER"].includes(user?.role || "");

    const fetchTeams = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ search, status });
        fetch(`/api/teams?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                setTeams(data.data || []);
            })
            .catch(() => setError("Gagal memuat daftar team"))
            .finally(() => setLoading(false));
    }, [search, status]);

    useEffect(() => {
        const timer = setTimeout(fetchTeams, 0);
        return () => clearTimeout(timer);
    }, [fetchTeams]);

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
    const inactiveTeams = teams.filter((team) => !team.isActive).length;
    const totalAssignedMembers = teams.reduce((sum, team) => sum + team.memberCount, 0);
    const avgRoster = teams.length ? Math.round(totalAssignedMembers / teams.length) : 0;
    const isFiltering = Boolean(search.trim()) || status !== "ALL";

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
                    <DashboardMetricCard
                        label="Avg. Roster"
                        value={loading ? "..." : avgRoster}
                        meta={`${helperText} ${inactiveTeams ? `Saat ini ada ${inactiveTeams} team nonaktif.` : ""}`.trim()}
                        tone="default"
                    />
                </div>

                {message ? (
                    <div className="rounded-box border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
                        {message}
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-box border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
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
                        {isFiltering ? (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/45">
                                <span>
                                    Menampilkan {teams.length} team untuk filter yang sedang aktif.
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch("");
                                        setStatus("ALL");
                                    }}
                                    className="font-medium text-primary transition-colors hover:text-primary/80"
                                >
                                    Reset Filter
                                </button>
                            </div>
                        ) : null}
                    </div>
                </DashboardPanel>

                <DashboardPanel title="Roster Team" description="Buka detail team untuk melihat roster lengkap dan mengatur assignment anggota dengan lebih nyaman.">
                    {loading ? (
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item} className="h-44 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                            ))}
                        </div>
                    ) : teams.length === 0 ? (
                        <DashboardEmptyState
                            title={isFiltering ? "Tidak ada team yang cocok" : "Belum ada team"}
                            description={
                                isFiltering
                                    ? "Coba longgarkan kata kunci atau ubah status filter agar daftar team muncul kembali."
                                    : "Buat struktur team dulu, lalu hubungkan member Duel Standby dari halaman detail team atau halaman Users."
                            }
                            actionLabel={isFiltering ? "Reset Filter" : undefined}
                            actionHref={isFiltering ? "/dashboard/teams" : undefined}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                            {teams.map((team) => (
                                <article key={team.id} className="rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-base-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-lg font-bold text-base-content">{team.name}</h3>
                                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${team.isActive ? "border-success/20 bg-success/10 text-success" : "border-base-300 bg-base-100 text-base-content/55"}`}>
                                                    {team.isActive ? "Aktif" : "Nonaktif"}
                                                </span>
                                            </div>
                                            <div className="text-[11px] uppercase tracking-[0.22em] text-base-content/45">/{team.slug}</div>
                                            <p className="text-sm leading-6 text-base-content/60">
                                                {team.description || "Belum ada deskripsi team. Tambahkan deskripsi singkat agar admin lain cepat mengenali roster ini."}
                                            </p>
                                        </div>
                                        <div className="rounded-box border border-primary/20 bg-primary/10 px-3 py-2 text-right">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Roster</div>
                                            <div className="mt-1 text-2xl font-black text-primary">{team.memberCount}</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-base-content/45">
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
                                            <button onClick={() => setTeamToDelete(team)} className={btnDanger} disabled={team.memberCount > 0}>
                                                Hapus Team
                                            </button>
                                        ) : null}
                                        {team.memberCount > 0 ? (
                                            <span className="self-center text-[11px] text-base-content/45">Kosongkan roster dari detail team sebelum hapus.</span>
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
                    <div className="relative w-full max-w-xl rounded-box border border-base-300 bg-base-100 p-6 shadow-2xl">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-base-content">
                                {editingTeam ? "Edit Team" : "Buat Team"}
                            </h2>
                            <p className="text-xs text-base-content/55">
                                Isi data inti team untuk kebutuhan roster.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                            <div className="space-y-3">
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
                                    <span className={labelCls}>Slug</span>
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
                                <span className={labelCls}>Deskripsi (Opsional)</span>
                                <textarea
                                    value={form.description}
                                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                    rows={3}
                                    className={`${inputCls} resize-none`}
                                    placeholder="Ringkas dan jelas."
                                />
                            </label>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                                <label className="block">
                                    <span className={labelCls}>Logo (Opsional)</span>
                                    <input
                                        value={form.logoUrl}
                                        onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
                                        className={inputCls}
                                        placeholder="/uploads/logo-team.jpg"
                                    />
                                </label>
                                <label className="block">
                                    <span className={labelCls}>Status</span>
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
                                    {saving ? "Menyimpan..." : editingTeam ? "Simpan" : "Buat Team"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {teamToDelete ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTeamToDelete(null)} />
                    <div className="relative w-full max-w-lg rounded-box border border-base-300 bg-base-100 p-6 shadow-2xl">
                        <div className="space-y-2">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-error">
                                Konfirmasi Hapus
                            </div>
                            <h2 className="text-xl font-bold text-base-content">Hapus team ini?</h2>
                            <p className="text-sm leading-6 text-base-content/60">
                                Team <span className="font-semibold text-base-content">{teamToDelete.name}</span> akan dihapus permanen.
                                Pastikan roster team ini sudah kosong sebelum melanjutkan.
                            </p>
                        </div>

                        <div className="mt-5 rounded-box border border-base-300 bg-base-200/40 p-4 text-sm">
                            <div className="font-semibold text-base-content">{teamToDelete.name}</div>
                            <div className="mt-1 text-base-content/60">/{teamToDelete.slug}</div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-base-content/45">
                                <span>{teamToDelete.isActive ? "Team aktif" : "Team nonaktif"}</span>
                                <span>|</span>
                                <span>Roster saat ini: {teamToDelete.memberCount}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setTeamToDelete(null)} className={btnOutline}>
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const target = teamToDelete;
                                    setTeamToDelete(null);
                                    if (target) {
                                        await handleDelete(target);
                                    }
                                }}
                                className={btnDanger}
                            >
                                Ya, Hapus Team
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </DashboardPageShell>
    );
}
