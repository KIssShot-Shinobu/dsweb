"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { btnOutline, btnPrimary, filterBarCls, searchInputCls } from "@/components/dashboard/form-styles";
import { FormSelect } from "@/components/dashboard/form-select";
import {
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";

type TeamMember = {
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
    city: string | null;
    avatarUrl: string | null;
    createdAt: string;
    lastActiveAt: string | null;
    teamJoinedAt: string | null;
};

type AvailableMember = {
    id: string;
    fullName: string;
    email: string;
    role: string;
    city: string | null;
    teamId: string | null;
    teamJoinedAt: string | null;
    lastActiveAt: string | null;
};

type TeamDetail = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    memberCount: number;
    members: TeamMember[];
    availableMembers: AvailableMember[];
};

type SelectOption = {
    value: string;
    label: string;
};

const ALL_ROLE_OPTION: SelectOption = { value: "ALL", label: "Semua Role" };

function formatDate(value?: string | null) {
    if (!value) return "Belum ada data";
    return new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getInitials(name: string) {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function buildRoleOptions(roles: string[]): SelectOption[] {
    return [
        ALL_ROLE_OPTION,
        ...roles.map((role) => ({
            value: role,
            label: role,
        })),
    ];
}

export function TeamDetailClient({ teamId }: { teamId: string }) {
    const { user } = useCurrentUser();
    const [team, setTeam] = useState<TeamDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rosterSearch, setRosterSearch] = useState("");
    const [candidateSearch, setCandidateSearch] = useState("");
    const [rosterRole, setRosterRole] = useState("ALL");
    const [candidateRole, setCandidateRole] = useState("ALL");
    const [pendingUserId, setPendingUserId] = useState<string | null>(null);
    const [memberToUnassign, setMemberToUnassign] = useState<TeamMember | null>(null);

    const isAdmin = ["ADMIN", "FOUNDER"].includes(user?.role || "");

    const loadTeam = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/teams/${teamId}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Gagal memuat detail team");
                setTeam(null);
                return;
            }

            setTeam(data.data);
        } catch {
            setError("Gagal memuat detail team");
            setTeam(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTeam();
    }, [teamId]);

    const handleAssign = async (userId: string) => {
        setPendingUserId(userId);
        setMessage(null);
        setError(null);

        try {
            const response = await fetch(`/api/teams/${teamId}/roster`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Gagal menambah roster");
                return;
            }

            setMessage(data.message || "Roster berhasil diperbarui.");
            await loadTeam();
        } catch {
            setError("Gagal menambah roster");
        } finally {
            setPendingUserId(null);
        }
    };

    const handleUnassign = async (userId: string) => {
        setPendingUserId(userId);
        setMessage(null);
        setError(null);

        try {
            const response = await fetch(`/api/teams/${teamId}/roster`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Gagal melepas roster");
                return;
            }

            setMessage(data.message || "Roster berhasil diperbarui.");
            await loadTeam();
        } catch {
            setError("Gagal melepas roster");
        } finally {
            setPendingUserId(null);
            setMemberToUnassign(null);
        }
    };

    const rosterRoleOptions = useMemo(() => {
        if (!team) return [ALL_ROLE_OPTION];
        return buildRoleOptions(Array.from(new Set(team.members.map((member) => member.role))));
    }, [team]);

    const candidateRoleOptions = useMemo(() => {
        if (!team) return [ALL_ROLE_OPTION];
        return buildRoleOptions(
            Array.from(
                new Set(
                    team.availableMembers
                        .filter((member) => !member.teamId || member.teamId === team.id)
                        .map((member) => member.role)
                )
            )
        );
    }, [team]);

    const filteredRoster = useMemo(() => {
        if (!team) return [];
        const query = rosterSearch.trim().toLowerCase();

        return team.members.filter((member) => {
            const matchesRole = rosterRole === "ALL" || member.role === rosterRole;
            const matchesQuery =
                !query ||
                [member.fullName, member.email, member.role, member.city || ""].some((value) =>
                    value.toLowerCase().includes(query)
                );

            return matchesRole && matchesQuery;
        });
    }, [team, rosterRole, rosterSearch]);

    const assignableMembers = useMemo(() => {
        if (!team) return [];
        const query = candidateSearch.trim().toLowerCase();

        return team.availableMembers.filter((member) => {
            const isAssignablePool = !member.teamId || member.teamId === team.id;
            const isAlreadyInRoster = member.teamId === team.id;
            const matchesRole = candidateRole === "ALL" || member.role === candidateRole;
            const matchesQuery =
                !query ||
                [member.fullName, member.email, member.role, member.city || ""].some((value) =>
                    value.toLowerCase().includes(query)
                );

            return isAssignablePool && !isAlreadyInRoster && matchesRole && matchesQuery;
        });
    }, [team, candidateRole, candidateSearch]);

    return (
        <DashboardPageShell>
            <div className="space-y-5 lg:space-y-6">
                <DashboardPageHeader
                    kicker="Guild Teams"
                    title={loading ? "Memuat Team..." : team?.name || "Detail Team"}
                    description={
                        team?.description ||
                        "Kelola roster resmi Duel Standby dari satu halaman agar assign dan review anggota team lebih cepat."
                    }
                    actions={
                        <>
                            <Link href="/dashboard/teams" className={btnOutline}>
                                Kembali ke Teams
                            </Link>
                            <Link href="/dashboard/users" className={btnOutline}>
                                Buka Users
                            </Link>
                        </>
                    }
                />

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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    <DashboardMetricCard
                        label="Roster Aktif"
                        value={loading ? "..." : team?.memberCount ?? 0}
                        meta="Jumlah member Duel Standby yang sedang terhubung ke team ini"
                        tone="accent"
                    />
                    <DashboardMetricCard
                        label="Kandidat Bebas"
                        value={loading ? "..." : assignableMembers.length}
                        meta="Member aktif tanpa team yang siap dimasukkan ke roster"
                        tone="success"
                    />
                    <DashboardMetricCard
                        label="Status Team"
                        value={loading ? "..." : team?.isActive ? "Aktif" : "Nonaktif"}
                        meta={team ? `Slug /${team.slug}` : "Memuat slug team"}
                        tone={team?.isActive ? "success" : "danger"}
                    />
                    <DashboardMetricCard
                        label="Diperbarui"
                        value={loading ? "..." : formatDate(team?.updatedAt)}
                        meta="Gunakan halaman ini untuk review roster dan mutasi anggota"
                    />
                </div>

                <DashboardPanel
                    title="Ringkasan Team"
                    description="Role komunitas dan afiliasi team tetap dipisah. User publik tidak akan tampil sebagai kandidat roster."
                >
                    {loading ? (
                        <div className="h-40 animate-pulse rounded-2xl border border-black/5 bg-slate-100/90 dark:border-white/6 dark:bg-white/[0.04]" />
                    ) : !team ? (
                        <DashboardEmptyState
                            title="Team tidak ditemukan"
                            description="Kembali ke halaman Teams untuk memastikan team yang dipilih masih tersedia."
                            actionHref="/dashboard/teams"
                            actionLabel="Kembali"
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                            <div className="rounded-2xl border border-black/5 bg-slate-50/80 p-4 dark:border-white/6 dark:bg-white/[0.03]">
                                <div className="flex items-start gap-4">
                                    {team.logoUrl ? (
                                        <img
                                            src={team.logoUrl}
                                            alt={team.name}
                                            className="h-16 w-16 rounded-2xl border border-black/5 object-cover dark:border-white/10"
                                        />
                                    ) : (
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ds-amber/15 text-lg font-black text-ds-amber">
                                            {getInitials(team.name)}
                                        </div>
                                    )}
                                    <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{team.name}</h2>
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${team.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" : "border-slate-200/80 text-slate-500 dark:border-white/10 dark:text-white/45"}`}>
                                                {team.isActive ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </div>
                                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">/{team.slug}</div>
                                        <p className="text-sm leading-6 text-slate-500 dark:text-white/45">
                                            {team.description || "Belum ada deskripsi team. Tambahkan identitas singkat supaya officer lain cepat membaca konteks roster ini."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                <div className="rounded-2xl border border-black/5 bg-slate-50/80 p-4 dark:border-white/6 dark:bg-white/[0.03]">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">Dibuat</div>
                                    <div className="mt-2 text-base font-bold text-slate-950 dark:text-white">{formatDate(team.createdAt)}</div>
                                </div>
                                <div className="rounded-2xl border border-black/5 bg-slate-50/80 p-4 dark:border-white/6 dark:bg-white/[0.03]">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">Terakhir Update</div>
                                    <div className="mt-2 text-base font-bold text-slate-950 dark:text-white">{formatDate(team.updatedAt)}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </DashboardPanel>

                <DashboardPanel
                    title="Roster Aktif"
                    description="Gunakan panel ini untuk meninjau semua anggota yang saat ini terhubung ke team ini."
                >
                    <div className={filterBarCls}>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                            <input
                                type="text"
                                value={rosterSearch}
                                onChange={(event) => setRosterSearch(event.target.value)}
                                placeholder="Cari nama, email, role, atau kota anggota roster..."
                                className={searchInputCls}
                            />
                            <FormSelect
                                value={rosterRole}
                                onChange={setRosterRole}
                                options={rosterRoleOptions}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {!team ? null : filteredRoster.length === 0 ? (
                        <div className="mt-4">
                            <DashboardEmptyState
                                title="Roster masih kosong"
                                description="Belum ada anggota yang terhubung ke team ini. Tambahkan dari panel kandidat di bawah."
                            />
                        </div>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                            {filteredRoster.map((member) => (
                                <article key={member.id} className="rounded-2xl border border-black/5 bg-slate-50/80 p-4 dark:border-white/6 dark:bg-white/[0.03]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-base font-bold text-slate-950 dark:text-white">{member.fullName}</h3>
                                                <span className="rounded-full border border-ds-amber/20 bg-ds-amber/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ds-amber">
                                                    {member.role}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-sm text-slate-500 dark:text-white/45">{member.email}</div>
                                            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-400 dark:text-white/35 sm:grid-cols-2">
                                                <div>Kota: {member.city || "Belum diisi"}</div>
                                                <div>Masuk team: {formatDate(member.teamJoinedAt)}</div>
                                                <div>Terakhir aktif: {formatDate(member.lastActiveAt)}</div>
                                                <div>Bergabung akun: {formatDate(member.createdAt)}</div>
                                            </div>
                                        </div>
                                        {isAdmin ? (
                                            <button
                                                type="button"
                                                onClick={() => setMemberToUnassign(member)}
                                                className={btnOutline}
                                                disabled={pendingUserId === member.id}
                                            >
                                                {pendingUserId === member.id ? "Memproses..." : "Lepas"}
                                            </button>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </DashboardPanel>

                <DashboardPanel
                    title="Kandidat Roster"
                    description={
                        isAdmin
                            ? "Tambahkan member Duel Standby yang belum punya team langsung dari halaman ini."
                            : "Officer bisa melihat kandidat roster di sini. Mutasi roster dilakukan oleh admin."
                    }
                >
                    <div className={filterBarCls}>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                            <input
                                type="text"
                                value={candidateSearch}
                                onChange={(event) => setCandidateSearch(event.target.value)}
                                placeholder="Cari kandidat berdasarkan nama, email, role, atau kota..."
                                className={searchInputCls}
                            />
                            <FormSelect
                                value={candidateRole}
                                onChange={setCandidateRole}
                                options={candidateRoleOptions}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {!team ? null : assignableMembers.length === 0 ? (
                        <div className="mt-4">
                            <DashboardEmptyState
                                title="Tidak ada kandidat bebas"
                                description="Semua member aktif sudah masuk ke team lain atau belum ada member aktif tanpa team."
                            />
                        </div>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                            {assignableMembers.map((member) => (
                                <article key={member.id} className="rounded-2xl border border-black/5 bg-slate-50/80 p-4 dark:border-white/6 dark:bg-white/[0.03]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate text-base font-bold text-slate-950 dark:text-white">{member.fullName}</h3>
                                                <span className="rounded-full border border-black/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 dark:text-white/45">
                                                    {member.role}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-sm text-slate-500 dark:text-white/45">{member.email}</div>
                                            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-400 dark:text-white/35 sm:grid-cols-2">
                                                <div>Kota: {member.city || "Belum diisi"}</div>
                                                <div>Terakhir aktif: {formatDate(member.lastActiveAt)}</div>
                                            </div>
                                        </div>
                                        {isAdmin ? (
                                            <button
                                                type="button"
                                                onClick={() => handleAssign(member.id)}
                                                className={btnPrimary}
                                                disabled={pendingUserId === member.id || !team.isActive}
                                            >
                                                {pendingUserId === member.id ? "Memproses..." : "Masukkan"}
                                            </button>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </DashboardPanel>
            </div>

            {memberToUnassign ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => (pendingUserId ? null : setMemberToUnassign(null))}
                    />
                    <div className="relative w-full max-w-lg rounded-3xl border border-black/5 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
                        <div className="space-y-2">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ds-amber/90">
                                Konfirmasi Roster
                            </div>
                            <h3 className="text-xl font-bold text-slate-950 dark:text-white">
                                Lepas anggota dari team?
                            </h3>
                            <p className="text-sm leading-6 text-slate-500 dark:text-white/45">
                                {memberToUnassign.fullName} akan dilepas dari roster{" "}
                                <span className="font-semibold text-slate-950 dark:text-white">
                                    {team?.name || "team ini"}
                                </span>
                                . Akun komunitasnya tetap aktif, tetapi afiliasi team akan dikosongkan.
                            </p>
                        </div>

                        <div className="mt-5 rounded-2xl border border-black/5 bg-slate-50/80 p-4 text-sm dark:border-white/6 dark:bg-white/[0.03]">
                            <div className="font-semibold text-slate-950 dark:text-white">{memberToUnassign.fullName}</div>
                            <div className="mt-1 text-slate-500 dark:text-white/45">{memberToUnassign.email}</div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-white/35">
                                <span>{memberToUnassign.role}</span>
                                <span>|</span>
                                <span>{memberToUnassign.city || "Kota belum diisi"}</span>
                                <span>|</span>
                                <span>Masuk team: {formatDate(memberToUnassign.teamJoinedAt)}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setMemberToUnassign(null)}
                                className={btnOutline}
                                disabled={pendingUserId === memberToUnassign.id}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUnassign(memberToUnassign.id)}
                                className={btnPrimary}
                                disabled={pendingUserId === memberToUnassign.id}
                            >
                                {pendingUserId === memberToUnassign.id ? "Melepas..." : "Ya, Lepas dari Team"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </DashboardPageShell>
    );
}
