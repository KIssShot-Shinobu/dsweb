"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { btnDanger, btnOutline, filterBarCls, searchInputCls } from "@/components/dashboard/form-styles";
import { FormSelect } from "@/components/dashboard/form-select";
import {
    DashboardEmptyState,
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

type TeamDetail = {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    memberCount: number;
    members: TeamMember[];
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
    const [rosterRole, setRosterRole] = useState("ALL");
    const [pendingUserId, setPendingUserId] = useState<string | null>(null);
    const [memberToUnassign, setMemberToUnassign] = useState<TeamMember | null>(null);

    const isAdmin = ["ADMIN", "FOUNDER"].includes(user?.role || "");

    const loadTeam = useCallback(async () => {
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
    }, [teamId]);

    useEffect(() => {
        loadTeam();
    }, [loadTeam]);

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

    const hasRosterFilters = Boolean(rosterSearch.trim()) || rosterRole !== "ALL";

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
                    <div className="rounded-box border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
                        {message}
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-box border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
                        {error}
                    </div>
                ) : null}

                <DashboardPanel
                    title="Ringkasan Team"
                    description="Role komunitas dan afiliasi team tetap dipisah agar data roster tetap rapi."
                >
                    {loading ? (
                        <div className="h-40 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                    ) : !team ? (
                        <DashboardEmptyState
                            title="Team tidak ditemukan"
                            description="Kembali ke halaman Teams untuk memastikan team yang dipilih masih tersedia."
                            actionHref="/dashboard/teams"
                            actionLabel="Kembali"
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm">
                                <div className="flex items-start gap-4">
                                    {normalizeAssetUrl(team.logoUrl) ? (
                                        <Image
                                            unoptimized
                                            src={normalizeAssetUrl(team.logoUrl) || ""}
                                            alt={team.name}
                                            width={64}
                                            height={64}
                                            className="h-16 w-16 rounded-2xl border border-base-300 object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-lg font-black text-primary">
                                            {getInitials(team.name)}
                                        </div>
                                    )}
                                    <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl font-black tracking-tight text-base-content">{team.name}</h2>
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${team.isActive ? "border-success/20 bg-success/10 text-success" : "border-base-300 bg-base-100 text-base-content/55"}`}>
                                                {team.isActive ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-6 text-base-content/60">
                                            {team.description || "Belum ada deskripsi team. Tambahkan identitas singkat supaya officer lain cepat membaca konteks roster ini."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm">
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1 border-b border-base-300 pb-3">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">Status</span>
                                        <span className="text-base font-bold text-base-content">
                                            {team.isActive ? "Aktif" : "Nonaktif"}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 border-b border-base-300 pb-3">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">Roster Aktif</span>
                                        <span className="text-base font-bold text-base-content">{team.memberCount} anggota</span>
                                    </div>
                                    <div className="flex flex-col gap-1 border-b border-base-300 pb-3">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">Dibuat</span>
                                        <span className="text-base font-bold text-base-content">{formatDate(team.createdAt)}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">Terakhir Update</span>
                                        <span className="text-base font-bold text-base-content">{formatDate(team.updatedAt)}</span>
                                    </div>
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
                        {hasRosterFilters ? (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/45">
                                <span>Menampilkan {filteredRoster.length} anggota roster sesuai filter aktif.</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRosterSearch("");
                                        setRosterRole("ALL");
                                    }}
                                    className="font-medium text-primary transition-colors hover:text-primary/80"
                                >
                                    Reset Filter
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {!team ? null : filteredRoster.length === 0 ? (
                        <div className="mt-4">
                            <DashboardEmptyState
                                title={hasRosterFilters ? "Tidak ada anggota yang cocok" : "Roster masih kosong"}
                                description={
                                    hasRosterFilters
                                        ? "Coba longgarkan kata kunci atau ubah role filter untuk melihat roster yang lain."
                                        : "Belum ada anggota yang terhubung ke team ini."
                                }
                            />
                        </div>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                            {filteredRoster.map((member) => (
                                <article key={member.id} className="rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                            {normalizeAssetUrl(member.avatarUrl) ? (
                                                <Image
                                                    unoptimized
                                                    src={normalizeAssetUrl(member.avatarUrl) || undefined}
                                                    alt={member.fullName}
                                                    width={48}
                                                    height={48}
                                                    className="h-12 w-12 flex-shrink-0 rounded-2xl border border-base-300 object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-sm font-bold text-primary">
                                                    {getInitials(member.fullName)}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="truncate text-base font-bold text-base-content">{member.fullName}</h3>
                                                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                                                        {member.role}
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-sm text-base-content/60">{member.email}</div>
                                                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-base-content/45 sm:grid-cols-2">
                                                    <div>Kota: {member.city || "Belum diisi"}</div>
                                                    <div>Masuk team: {formatDate(member.teamJoinedAt)}</div>
                                                    <div>Terakhir aktif: {formatDate(member.lastActiveAt)}</div>
                                                    <div>Bergabung akun: {formatDate(member.createdAt)}</div>
                                                </div>
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

            </div>

            {memberToUnassign ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => (pendingUserId ? null : setMemberToUnassign(null))}
                    />
                    <div className="relative w-full max-w-lg rounded-box border border-base-300 bg-base-100 p-6 shadow-2xl">
                        <div className="space-y-2">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                                Konfirmasi Roster
                            </div>
                            <h3 className="text-xl font-bold text-base-content">
                                Lepas anggota dari team?
                            </h3>
                            <p className="text-sm leading-6 text-base-content/60">
                                {memberToUnassign.fullName} akan dilepas dari roster{" "}
                                <span className="font-semibold text-base-content">
                                    {team?.name || "team ini"}
                                </span>
                                . Akun komunitasnya tetap aktif, tetapi afiliasi team akan dikosongkan.
                            </p>
                        </div>

                        <div className="mt-5 rounded-box border border-base-300 bg-base-200/40 p-4 text-sm">
                            <div className="flex items-start gap-3">
                                {normalizeAssetUrl(memberToUnassign.avatarUrl) ? (
                                    <Image
                                        unoptimized
                                        src={normalizeAssetUrl(memberToUnassign.avatarUrl) || undefined}
                                        alt={memberToUnassign.fullName}
                                        width={48}
                                        height={48}
                                        className="h-12 w-12 flex-shrink-0 rounded-2xl border border-base-300 object-cover"
                                    />
                                ) : (
                                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-sm font-bold text-primary">
                                        {getInitials(memberToUnassign.fullName)}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <div className="font-semibold text-base-content">{memberToUnassign.fullName}</div>
                                    <div className="mt-1 text-base-content/60">{memberToUnassign.email}</div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-base-content/45">
                                        <span>{memberToUnassign.role}</span>
                                        <span>|</span>
                                        <span>{memberToUnassign.city || "Kota belum diisi"}</span>
                                        <span>|</span>
                                        <span>Masuk team: {formatDate(memberToUnassign.teamJoinedAt)}</span>
                                    </div>
                                </div>
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
                                className={btnDanger}
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
