"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { useToast } from "@/components/dashboard/toast";
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
    description: string | null;
    logoUrl: string | null;
    isActive: boolean;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
}

interface TeamRequestRow {
    id: string;
    teamName: string;
    description: string | null;
    logoUrl: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    requester: {
        id: string;
        fullName: string;
        username: string;
        email: string;
    };
}

const STATUS_OPTIONS = [
    { value: "ALL", label: "Semua Team" },
    { value: "ACTIVE", label: "Aktif" },
    { value: "INACTIVE", label: "Nonaktif" },
];

const REQUEST_STATUS_OPTIONS = [
    { value: "ALL", label: "Semua Status" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "Disetujui" },
    { value: "REJECTED", label: "Ditolak" },
];

const emptyForm = {
    name: "",
    description: "",
    logoUrl: "",
    isActive: true,
};

export default function TeamsPage() {
    const { user } = useCurrentUser();
    const [teams, setTeams] = useState<TeamRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("ALL");
    const [requestStatus, setRequestStatus] = useState("PENDING");
    const [requests, setRequests] = useState<TeamRequestRow[]>([]);
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestActionId, setRequestActionId] = useState<string | null>(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectTarget, setRejectTarget] = useState<TeamRequestRow | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
    const [teamToDelete, setTeamToDelete] = useState<TeamRow | null>(null);
    const [form, setForm] = useState(emptyForm);
    const { success, error: toastError } = useToast();

    const isAdmin = ["ADMIN", "FOUNDER"].includes(user?.role || "");

    const fetchTeams = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ search, status });
        fetch(`/api/teams?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                setTeams(data.data || []);
            })
            .catch(() => toastError("Gagal memuat daftar team"))
            .finally(() => setLoading(false));
    }, [search, status, toastError]);

    const fetchRequests = useCallback(() => {
        if (!isAdmin) return;
        setRequestLoading(true);
        const params = new URLSearchParams();
        if (requestStatus) params.set("status", requestStatus);
        fetch(`/api/team-requests?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                setRequests(data.data || []);
            })
            .catch(() => toastError("Gagal memuat request team"))
            .finally(() => setRequestLoading(false));
    }, [isAdmin, requestStatus, toastError]);

    useEffect(() => {
        const timer = setTimeout(fetchTeams, 0);
        return () => clearTimeout(timer);
    }, [fetchTeams]);

    useEffect(() => {
        const timer = setTimeout(fetchRequests, 0);
        return () => clearTimeout(timer);
    }, [fetchRequests]);

    const resetModal = () => {
        setModalOpen(false);
        setEditingTeam(null);
        setForm(emptyForm);
        setUploadingLogo(false);
    };

    const openCreate = () => {
        setEditingTeam(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (team: TeamRow) => {
        setEditingTeam(team);
        setForm({
            name: team.name,
            description: team.description || "",
            logoUrl: team.logoUrl || "",
            isActive: team.isActive,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);

        const method = editingTeam ? "PUT" : "POST";
        const url = editingTeam ? `/api/teams/${editingTeam.id}` : "/api/teams";

        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        const data = await response.json();

        if (!response.ok) {
            toastError(data.message || "Gagal menyimpan team");
            setSaving(false);
            return;
        }

        setSaving(false);
        success(editingTeam ? "Perubahan team berhasil disimpan." : "Team baru berhasil dibuat.");
        resetModal();
        fetchTeams();
    };

    const handleLogoUpload = async (file: File) => {
        setUploadingLogo(true);

        try {
            const body = new FormData();
            body.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body,
            });
            const data = await res.json();

            if (res.ok && data?.url) {
                setForm((current) => ({ ...current, logoUrl: data.url }));
                success("Logo team berhasil diupload.");
            } else {
                toastError(data?.message || "Gagal upload logo.");
            }
        } catch {
            toastError("Kesalahan jaringan saat upload logo.");
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleApproveRequest = async (request: TeamRequestRow) => {
        setRequestActionId(request.id);

        try {
            const response = await fetch(`/api/team-requests/${request.id}/approve`, { method: "POST" });
            const data = await response.json();

            if (!response.ok) {
                toastError(data.error || data.message || "Gagal menyetujui request.");
                return;
            }

            success(`Request team "${request.teamName}" disetujui.`);
            fetchRequests();
            fetchTeams();
        } finally {
        setRequestActionId(null);
        }
    };

    const handleRejectRequest = async () => {
        if (!rejectTarget) return;
        setRequestActionId(rejectTarget.id);

        try {
            const response = await fetch(`/api/team-requests/${rejectTarget.id}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: rejectReason }),
            });
            const data = await response.json();

            if (!response.ok) {
                toastError(data.error || data.message || "Gagal menolak request.");
                return;
            }

            success(`Request team "${rejectTarget.teamName}" ditolak.`);
            setRejectModalOpen(false);
            setRejectReason("");
            setRejectTarget(null);
        fetchRequests();
        } finally {
            setRequestActionId(null);
        }
    };

    const handleDelete = async (team: TeamRow) => {
        const response = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
        const data = await response.json();

        if (!response.ok) {
            toastError(data.message || "Gagal menghapus team");
            return;
        }

        success(`Team ${team.name} berhasil dihapus.`);
        fetchTeams();
    };

    const activeTeams = teams.filter((team) => team.isActive).length;
    const inactiveTeams = teams.filter((team) => !team.isActive).length;
    const totalAssignedMembers = teams.reduce((sum, team) => sum + team.memberCount, 0);
    const avgRoster = teams.length ? Math.round(totalAssignedMembers / teams.length) : 0;
    const isFiltering = Boolean(search.trim()) || status !== "ALL";
    const hasRequestFilter = requestStatus !== "ALL";

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

                {isAdmin ? (
                    <DashboardPanel title="Team Requests" description="Review request pembuatan team dari user, setujui atau tolak dengan cepat.">
                        <div className={filterBarCls}>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                                <div className="text-sm text-base-content/60">
                                    {requestLoading ? "Memuat request..." : `${requests.length} request ditemukan`}
                                </div>
                                <FormSelect value={requestStatus} onChange={setRequestStatus} options={REQUEST_STATUS_OPTIONS} className="w-full" />
                            </div>
                            {hasRequestFilter ? (
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/45">
                                    <span>Filter aktif: {requestStatus}</span>
                                    <button
                                        type="button"
                                        onClick={() => setRequestStatus("ALL")}
                                        className="font-medium text-primary transition-colors hover:text-primary/80"
                                    >
                                        Reset Filter
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {requestLoading ? (
                            <div className="mt-4 space-y-3">
                                {[1, 2, 3].map((item) => (
                                    <div key={item} className="h-20 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                                ))}
                            </div>
                        ) : requests.length === 0 ? (
                            <DashboardEmptyState
                                title="Belum ada request"
                                description="Request pembuatan team akan muncul di sini saat user mengajukan."
                                actionLabel={hasRequestFilter ? "Reset Filter" : undefined}
                                actionHref={hasRequestFilter ? "/dashboard/teams" : undefined}
                            />
                        ) : (
                            <div className="mt-4 space-y-3">
                                {requests.map((request) => {
                                    const statusTone =
                                        request.status === "APPROVED"
                                            ? "border-success/20 bg-success/10 text-success"
                                            : request.status === "REJECTED"
                                              ? "border-error/20 bg-error/10 text-error"
                                              : "border-warning/20 bg-warning/10 text-warning";

                                    return (
                                        <div
                                            key={request.id}
                                            className="flex flex-col gap-3 rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-base-100 lg:flex-row lg:items-center"
                                        >
                                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-base-300 bg-base-100 text-xs font-bold text-base-content/50">
                                                {request.logoUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={normalizeAssetUrl(request.logoUrl) || ""}
                                                        alt={request.teamName}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    request.teamName
                                                        .split(" ")
                                                        .map((part) => part[0])
                                                        .join("")
                                                        .slice(0, 2)
                                                        .toUpperCase()
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="truncate text-base font-semibold text-base-content">{request.teamName}</div>
                                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${statusTone}`}>
                                                        {request.status}
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-sm text-base-content/60">
                                                    {request.description || "Tanpa deskripsi."}
                                                </div>
                                                <div className="mt-2 text-xs text-base-content/50">
                                                    Oleh {request.requester.fullName} (@{request.requester.username}) · {request.requester.email}
                                                </div>
                                                <div className="mt-2 text-[11px] text-base-content/45">
                                                    Dikirim {new Date(request.createdAt).toLocaleDateString("id-ID")}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                                {request.status === "PENDING" ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApproveRequest(request)}
                                                            className={btnPrimary}
                                                            disabled={requestActionId === request.id}
                                                        >
                                                            {requestActionId === request.id ? "Memproses..." : "Setujui"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setRejectTarget(request);
                                                                setRejectModalOpen(true);
                                                            }}
                                                            className={btnDanger}
                                                            disabled={requestActionId === request.id}
                                                        >
                                                            Tolak
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-base-content/45">Sudah diproses</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </DashboardPanel>
                ) : null}

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

                <DashboardPanel title="Filter Team" description="Cari team berdasarkan nama atau status aktif roster.">
                    <div className={filterBarCls}>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari nama team..."
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
                        <div className="space-y-3">
                            {teams.map((team) => {
                                const statusTone = team.isActive
                                    ? "border-success/20 bg-success/10 text-success"
                                    : "border-base-300 bg-base-100 text-base-content/55";

                                return (
                                    <div
                                        key={team.id}
                                        className="flex flex-col gap-3 rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm transition-all hover:border-primary/20 hover:bg-base-100 lg:flex-row lg:items-center"
                                    >
                                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-base-300 bg-base-100 text-xs font-bold text-base-content/50">
                                            {team.logoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={normalizeAssetUrl(team.logoUrl) || ""}
                                                    alt={team.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                team.name
                                                    .split(" ")
                                                    .map((part) => part[0])
                                                    .join("")
                                                    .slice(0, 2)
                                                    .toUpperCase()
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="truncate text-base font-semibold text-base-content">{team.name}</div>
                                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${statusTone}`}>
                                                    {team.isActive ? "Aktif" : "Nonaktif"}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-sm text-base-content/60">
                                                {team.description || "Belum ada deskripsi team."}
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-base-content/50">
                                                <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1">Roster {team.memberCount}</span>
                                                <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1">
                                                    Dibuat {new Date(team.createdAt).toLocaleDateString("id-ID")}
                                                </span>
                                                <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1">
                                                    Update {new Date(team.updatedAt).toLocaleDateString("id-ID")}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                            <Link href={`/dashboard/teams/${team.id}`} className={btnPrimary}>
                                                Detail
                                            </Link>
                                            {isAdmin ? (
                                                <button onClick={() => openEdit(team)} className={btnOutline}>
                                                    Edit
                                                </button>
                                            ) : null}
                                            {isAdmin ? (
                                                <button onClick={() => setTeamToDelete(team)} className={btnDanger} disabled={team.memberCount > 0}>
                                                    Hapus
                                                </button>
                                            ) : null}
                                            {team.memberCount > 0 ? (
                                                <span className="text-[11px] text-base-content/45">Kosongkan roster sebelum hapus.</span>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
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

                            <div className="space-y-3">
                                <label className={labelCls}>Upload Logo Team</label>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    className={`${inputCls} file:mr-3 file:rounded-xl file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:font-semibold file:text-primary`}
                                    onChange={async (event) => {
                                        const inputEl = event.currentTarget;
                                        const file = event.target.files?.[0];
                                        if (!file) return;
                                        await handleLogoUpload(file);
                                        inputEl.value = "";
                                    }}
                                    disabled={uploadingLogo}
                                />
                                {uploadingLogo ? <p className="text-xs text-base-content/45">Mengupload logo...</p> : null}
                                {form.logoUrl ? (
                                    <div className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={normalizeAssetUrl(form.logoUrl) || ""}
                                            alt="Preview logo team"
                                            className="h-16 w-16 rounded-xl object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}
                                            className="text-xs font-medium text-error hover:text-error/80"
                                        >
                                            Hapus logo
                                        </button>
                                    </div>
                                ) : null}
                            </div>

                            <label className="block">
                                <span className={labelCls}>Status</span>
                                <FormSelect
                                    value={form.isActive ? "ACTIVE" : "INACTIVE"}
                                    onChange={(value) => setForm((current) => ({ ...current, isActive: value === "ACTIVE" }))}
                                    options={STATUS_OPTIONS.filter((option) => option.value !== "ALL")}
                                    className="w-full"
                                />
                            </label>

                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <button type="button" onClick={resetModal} className={btnOutline}>Batal</button>
                                <button type="submit" className={btnPrimary} disabled={saving || uploadingLogo}>
                                    {saving ? "Menyimpan..." : editingTeam ? "Simpan" : "Buat Team"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {rejectModalOpen && rejectTarget ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => {
                            setRejectModalOpen(false);
                            setRejectReason("");
                            setRejectTarget(null);
                        }}
                    />
                    <div className="relative w-full max-w-lg rounded-box border border-base-300 bg-base-100 p-6 shadow-2xl">
                        <div className="space-y-2">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-error">
                                Konfirmasi Tolak
                            </div>
                            <h2 className="text-xl font-bold text-base-content">Tolak request team?</h2>
                            <p className="text-sm leading-6 text-base-content/60">
                                Request dari <span className="font-semibold text-base-content">{rejectTarget.requester.fullName}</span> untuk team{" "}
                                <span className="font-semibold text-base-content">{rejectTarget.teamName}</span> akan ditolak.
                            </p>
                        </div>

                        <label className="mt-4 block">
                            <span className={labelCls}>Alasan (Opsional)</span>
                            <textarea
                                className={`${inputCls} min-h-[104px] resize-none`}
                                value={rejectReason}
                                onChange={(event) => setRejectReason(event.target.value)}
                                placeholder="Contoh: Nama team sudah digunakan."
                            />
                        </label>

                        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setRejectModalOpen(false);
                                    setRejectReason("");
                                    setRejectTarget(null);
                                }}
                                className={btnOutline}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleRejectRequest}
                                className={btnDanger}
                                disabled={requestActionId === rejectTarget.id}
                            >
                                {requestActionId === rejectTarget.id ? "Memproses..." : "Tolak Request"}
                            </button>
                        </div>
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
