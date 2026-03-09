"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { FormSelect } from "@/components/dashboard/form-select";
import { Pagination } from "@/components/dashboard/pagination";
import {
    btnDanger,
    btnOutline,
    btnPrimary,
    filterBarCls,
    inputCls,
    searchInputCls,
} from "@/components/dashboard/form-styles";
import {
    DashboardEmptyState,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";

interface UserTeam {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
}

interface UserRow {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    phoneWhatsapp: string | null;
    city: string | null;
    status: string;
    role: string;
    teamId: string | null;
    teamJoinedAt: string | null;
    createdAt: string;
    gameProfiles: { gameType: string; ign: string; gameId: string }[];
    team: UserTeam | null;
}

interface TeamOption {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    memberCount: number;
}

interface UserManagementTableProps {
    title: string;
    description: string;
    defaultStatus?: string;
    lockStatus?: boolean;
    defaultRole?: string;
    lockRole?: boolean;
    emptyTitle: string;
    emptyDescription: string;
}

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    BANNED: "bg-red-500/10 text-red-500 border-red-500/20",
};

const ROLE_COLORS: Record<string, string> = {
    USER: "text-slate-500 dark:text-white/55",
    MEMBER: "text-blue-400",
    OFFICER: "text-purple-400",
    ADMIN: "text-ds-amber",
    FOUNDER: "text-red-400",
};

const ROLE_OPTIONS = ["USER", "MEMBER", "OFFICER", "ADMIN"];
const FILTER_ROLE_OPTIONS = ["ALL", "USER", "MEMBER", "OFFICER", "ADMIN", "FOUNDER"];
const STATUS_FILTER_OPTIONS = [
    { value: "ALL", label: "Semua Status" },
    { value: "ACTIVE", label: "Aktif" },
    { value: "BANNED", label: "Banned" },
];
const ROLE_FILTER_OPTIONS = FILTER_ROLE_OPTIONS.map((role) => ({
    value: role,
    label: role === "ALL" ? "Semua Role" : role,
}));

function RoleDropdown({
    userId,
    currentRole,
    currentStatus,
    currentTeamId,
    onChanged,
    onFeedback,
}: {
    userId: string;
    currentRole: string;
    currentStatus: string;
    currentTeamId: string | null;
    onChanged: () => void;
    onFeedback: (feedback: { type: "success" | "error"; message: string }) => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const changeRole = async (newRole: string) => {
        if (newRole === currentRole) {
            setOpen(false);
            return;
        }

        setLoading(true);
        setOpen(false);
        const response = await fetch(`/api/users/${userId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: currentStatus,
                role: newRole,
                teamId: newRole === "USER" ? null : currentTeamId,
            }),
        });
        const data = await response.json();
        setLoading(false);
        if (!response.ok) {
            onFeedback({ type: "error", message: data.message || "Gagal memperbarui role user." });
            return;
        }
        onFeedback({
            type: "success",
            message:
                newRole === "USER" && currentTeamId
                    ? "Role user diperbarui dan afiliasi team dilepas otomatis."
                    : data.message || `Role user berhasil diubah ke ${newRole}.`,
        });
        onChanged();
    };

    return (
        <div className="relative flex-shrink-0">
            <button
                onClick={() => setOpen((value) => !value)}
                disabled={loading}
                className={`flex items-center gap-1 rounded-2xl border border-current/20 px-2.5 py-1.5 text-[10px] font-bold uppercase transition-all hover:bg-white/5 disabled:opacity-50 ${ROLE_COLORS[currentRole] || "text-slate-500"}`}
            >
                {loading ? "..." : currentRole}
                <svg className={`h-3 w-3 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open ? (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 min-w-[132px] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
                        {ROLE_OPTIONS.map((role) => (
                            <button
                                key={role}
                                onClick={() => changeRole(role)}
                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase transition-all ${
                                    role === currentRole
                                        ? `${ROLE_COLORS[role]} bg-slate-50 dark:bg-white/5`
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-white/55 dark:hover:bg-white/5 dark:hover:text-white"
                                }`}
                            >
                                {role === currentRole ? <span className="text-[8px]">OK</span> : null}
                                {role}
                            </button>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
}

function TeamDropdown({
    user,
    teams,
    onChanged,
    onFeedback,
}: {
    user: UserRow;
    teams: TeamOption[];
    onChanged: () => void;
    onFeedback: (feedback: { type: "success" | "error"; message: string }) => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const disabled = user.role === "USER" || user.role === "FOUNDER";
    const currentLabel = user.role === "USER" ? "Public" : user.team?.name || "Tanpa Team";

    const changeTeam = async (nextTeamId: string | null) => {
        if (nextTeamId === user.teamId) {
            setOpen(false);
            return;
        }

        setLoading(true);
        setOpen(false);
        const response = await fetch(`/api/users/${user.id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: user.status,
                role: user.role,
                teamId: nextTeamId,
            }),
        });
        const data = await response.json();
        setLoading(false);
        if (!response.ok) {
            onFeedback({ type: "error", message: data.message || "Gagal memperbarui afiliasi team." });
            return;
        }
        onFeedback({
            type: "success",
            message: nextTeamId ? "Afiliasi team user berhasil diperbarui." : "User berhasil dilepas dari team.",
        });
        onChanged();
    };

    return (
        <div className="relative flex-shrink-0">
            <button
                onClick={() => !disabled && setOpen((value) => !value)}
                disabled={loading || disabled}
                className="flex min-w-[132px] items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70 dark:hover:bg-white/[0.06]"
            >
                <span className="truncate">{loading ? "Memuat..." : currentLabel}</span>
                {!disabled ? (
                    <svg className={`h-3 w-3 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                ) : null}
            </button>

            {open ? (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
                        <button
                            onClick={() => changeTeam(null)}
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium transition-all ${
                                !user.teamId
                                    ? "bg-slate-50 text-slate-950 dark:bg-white/5 dark:text-white"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
                            }`}
                        >
                            <span>Tanpa Team</span>
                            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/35">None</span>
                        </button>
                        {teams.map((team) => (
                            <button
                                key={team.id}
                                onClick={() => changeTeam(team.id)}
                                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium transition-all ${
                                    team.id === user.teamId
                                        ? "bg-slate-50 text-slate-950 dark:bg-white/5 dark:text-white"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
                                }`}
                            >
                                <span className="truncate">{team.name}</span>
                                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/35">{team.memberCount}</span>
                            </button>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
}

function UserManagementTableInner({
    title,
    description,
    defaultStatus = "ALL",
    lockStatus = false,
    defaultRole = "ALL",
    lockRole = false,
    emptyTitle,
    emptyDescription,
}: UserManagementTableProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const statusFilter = lockStatus ? defaultStatus : searchParams.get("status") || defaultStatus;
    const roleFilter = lockRole ? defaultRole : searchParams.get("role") || defaultRole;
    const teamFilter = searchParams.get("teamId") || "ALL";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);

    const [users, setUsers] = useState<UserRow[]>([]);
    const [teams, setTeams] = useState<TeamOption[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [banModal, setBanModal] = useState<{ id: string; name: string } | null>(null);
    const [unbanModal, setUnbanModal] = useState<{ id: string; name: string; role: string; teamId: string | null } | null>(null);
    const [reason, setReason] = useState("");
    const [searchInput, setSearchInput] = useState(search);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const perPage = 15;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const teamFilterOptions = useMemo(
        () => [
            { value: "ALL", label: "Semua Team" },
            { value: "NO_TEAM", label: "Tanpa Team" },
            ...teams.map((team) => ({ value: team.id, label: team.name })),
        ],
        [teams]
    );

    const paramsString = useMemo(() => {
        const params = new URLSearchParams({
            status: statusFilter,
            role: roleFilter,
            teamId: teamFilter,
            search,
            page: String(page),
            perPage: String(perPage),
        });
        return params.toString();
    }, [page, perPage, roleFilter, search, statusFilter, teamFilter]);

    useEffect(() => {
        setSearchInput(search);
    }, [search]);

    const fetchUsers = () => {
        setLoading(true);
        fetch(`/api/users?${paramsString}`)
            .then((response) => response.json())
            .then((data) => {
                setUsers(data.data || []);
                setTotal(data.total || 0);
                setTeams(data.filters?.teams || []);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, [paramsString]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchInput !== search) {
                setParam("search", searchInput);
            }
        }, 250);

        return () => clearTimeout(timeoutId);
    }, [search, searchInput]);

    const setParam = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        if (key !== "page") params.set("page", "1");
        if (lockStatus) params.set("status", defaultStatus);
        if (lockRole) params.set("role", defaultRole);
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const resetFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("search");
        params.delete("teamId");
        params.set("page", "1");

        if (lockStatus) {
            params.set("status", defaultStatus);
        } else {
            params.delete("status");
        }

        if (lockRole) {
            params.set("role", defaultRole);
        } else {
            params.delete("role");
        }

        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const handleBan = async (id: string, banReason?: string) => {
        setActionLoading(id);
        setFeedback(null);
        const response = await fetch(`/api/users/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "BANNED", reason: banReason }),
        });
        const data = await response.json();
        setActionLoading(null);
        if (!response.ok) {
            setFeedback({ type: "error", message: data.message || "Gagal memblokir user." });
            return;
        }
        setFeedback({ type: "success", message: data.message || "User berhasil diblokir." });
        setBanModal(null);
        setReason("");
        fetchUsers();
    };

    const handleUnban = async (user: { id: string; name: string; role: string; teamId: string | null }) => {
        setActionLoading(user.id);
        setFeedback(null);
        const response = await fetch(`/api/users/${user.id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ACTIVE", role: user.role, teamId: user.teamId }),
        });
        const data = await response.json();
        setActionLoading(null);
        if (!response.ok) {
            setFeedback({ type: "error", message: data.message || "Gagal mengaktifkan kembali user." });
            return;
        }
        setFeedback({ type: "success", message: data.message || "User berhasil diaktifkan kembali." });
        setUnbanModal(null);
        fetchUsers();
    };

    const getInitials = (name: string) =>
        name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

    const visibleActiveCount = users.filter((user) => user.status === "ACTIVE").length;
    const visibleMemberCount = users.filter((user) => user.role !== "USER").length;
    const withoutTeamCount = users.filter((user) => user.role !== "USER" && !user.teamId).length;
    const hasActiveFilters =
        Boolean(search.trim()) ||
        (!lockStatus && statusFilter !== defaultStatus) ||
        (!lockRole && roleFilter !== defaultRole) ||
        teamFilter !== "ALL";

    return (
        <DashboardPageShell>
            <div className="space-y-5 lg:space-y-6">
                <DashboardPageHeader kicker="Guild Directory" title={title} description={description} />

                {feedback ? (
                    <div
                        className={`rounded-2xl border px-4 py-3 text-sm ${
                            feedback.type === "success"
                                ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-500"
                                : "border-red-500/20 bg-red-500/8 text-red-500"
                        }`}
                    >
                        {feedback.message}
                    </div>
                ) : null}

                <DashboardPanel title="Filter & Search" description="Cari akun publik, member Duel Standby, atau roster team aktif dari satu tempat.">
                    <div className={filterBarCls}>
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_220px]">
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Cari nama, email, kota, atau team..."
                                className={searchInputCls}
                            />
                            {!lockStatus ? (
                                <FormSelect value={statusFilter} onChange={(value) => setParam("status", value)} options={STATUS_FILTER_OPTIONS} className="w-full" />
                            ) : null}
                            {!lockRole ? (
                                <FormSelect value={roleFilter} onChange={(value) => setParam("role", value)} options={ROLE_FILTER_OPTIONS} className="w-full" />
                            ) : null}
                            <FormSelect value={teamFilter} onChange={(value) => setParam("teamId", value)} options={teamFilterOptions} className="w-full" />
                        </div>
                        {hasActiveFilters ? (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 dark:text-white/35">
                                <span>Menampilkan {total} akun yang sesuai dengan filter aktif.</span>
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="font-medium text-ds-amber transition-colors hover:text-ds-gold"
                                >
                                    Reset Filter
                                </button>
                            </div>
                        ) : null}
                    </div>
                </DashboardPanel>

                <DashboardPanel title="Daftar Users" description={`Menampilkan ${total} akun yang sesuai dengan filter role komunitas, status, dan team.`}>
                    <div className="mb-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-ds-amber/20 bg-ds-amber/10 px-3 py-1 text-[11px] font-semibold text-ds-amber">
                            Visible: {loading ? "..." : users.length}
                        </span>
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-500">
                            Active: {loading ? "..." : visibleActiveCount}
                        </span>
                        <span className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">
                            Members: {loading ? "..." : visibleMemberCount}
                        </span>
                        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-400">
                            No Team: {loading ? "..." : withoutTeamCount}
                        </span>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="h-24 animate-pulse rounded-2xl border border-black/5 bg-slate-100/90 dark:border-white/6 dark:bg-white/[0.04]" />
                            ))}
                        </div>
                    ) : users.length === 0 ? (
                        <DashboardEmptyState
                            title={hasActiveFilters ? "Tidak ada user yang cocok" : emptyTitle}
                            description={
                                hasActiveFilters
                                    ? "Coba longgarkan kata kunci pencarian atau ubah filter role, status, dan team."
                                    : emptyDescription
                            }
                        />
                    ) : (
                        <div className="space-y-3">
                            {users.map((user) => (
                                <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-slate-50/80 p-4 transition-all hover:bg-white dark:border-white/6 dark:bg-white/[0.03] dark:hover:bg-white/[0.05] xl:flex-row xl:items-center">
                                    <div className="flex items-center gap-3 xl:w-[260px] xl:flex-shrink-0">
                                        {normalizeAssetUrl(user.avatarUrl) ? (
                                            <img
                                                src={normalizeAssetUrl(user.avatarUrl) || undefined}
                                                alt={user.fullName}
                                                className="h-11 w-11 flex-shrink-0 rounded-2xl border border-black/5 object-cover dark:border-white/10"
                                            />
                                        ) : (
                                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-ds-amber text-sm font-bold text-black">
                                                {getInitials(user.fullName)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{user.fullName}</div>
                                            <div className="truncate text-xs text-slate-400 dark:text-white/40">{user.email}</div>
                                            <div className="truncate text-[11px] text-slate-400 dark:text-white/35">{user.city || "Kota belum diisi"}</div>
                                        </div>
                                    </div>

                                    <div className="grid flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_150px_150px_150px_180px] xl:items-center">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap gap-1.5">
                                                {user.gameProfiles.length > 0 ? (
                                                    user.gameProfiles.map((profile) => (
                                                        <span key={`${user.id}-${profile.gameType}`} className="rounded-full bg-ds-amber/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-amber">
                                                            {profile.ign}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400 dark:text-white/35">Belum ada game profile</span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 dark:text-white/35">
                                                Bergabung {new Date(user.createdAt).toLocaleDateString("id-ID")}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${STATUS_COLORS[user.status] || ""}`}>
                                                {user.status}
                                            </span>
                                        </div>

                                        <RoleDropdown
                                            userId={user.id}
                                            currentRole={user.role}
                                            currentStatus={user.status}
                                            currentTeamId={user.teamId}
                                            onChanged={fetchUsers}
                                            onFeedback={setFeedback}
                                        />

                                        <TeamDropdown user={user} teams={teams} onChanged={fetchUsers} onFeedback={setFeedback} />

                                        <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                                            {user.team ? (
                                                <Link href={`/dashboard/teams/${user.team.id}`} className={btnOutline}>
                                                    Lihat Team
                                                </Link>
                                            ) : null}
                                            {user.team ? (
                                                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-500">
                                                    {user.team.name}
                                                </span>
                                            ) : user.role !== "USER" ? (
                                                <span className="rounded-full border border-slate-200/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 dark:text-white/45">
                                                    No Team
                                                </span>
                                            ) : (
                                                <span className="rounded-full border border-slate-200/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 dark:text-white/45">
                                                    Public User
                                                </span>
                                            )}

                                            {user.status === "ACTIVE" && user.role !== "FOUNDER" ? (
                                                <button
                                                    onClick={() => setBanModal({ id: user.id, name: user.fullName })}
                                                    disabled={actionLoading === user.id}
                                                    className={btnDanger}
                                                    title="Ban user"
                                                >
                                                    Ban
                                                </button>
                                            ) : null}

                                            {user.status === "BANNED" ? (
                                                <button
                                                    onClick={() => setUnbanModal({ id: user.id, name: user.fullName, role: user.role, teamId: user.teamId })}
                                                    disabled={actionLoading === user.id}
                                                    className={btnOutline}
                                                    title="Unban user"
                                                >
                                                    Unban
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-5">
                        <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPage={(nextPage) => setParam("page", String(nextPage))} />
                    </div>
                </DashboardPanel>
            </div>

            {banModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBanModal(null)} />
                    <div className="relative w-full max-w-md rounded-3xl border border-black/5 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
                        <h3 className="text-lg font-bold text-slate-950 dark:text-white">Ban User</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-white/45">
                            Aksi ini akan memblokir <strong className="text-slate-950 dark:text-white">{banModal.name}</strong> dari akses dashboard dan fitur utama.
                        </p>
                        <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="Alasan ban (opsional)..."
                            rows={4}
                            className={`${inputCls} mt-4 resize-none`}
                        />
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button onClick={() => setBanModal(null)} className={btnOutline}>
                                Batal
                            </button>
                            <button onClick={() => handleBan(banModal.id, reason)} className={btnDanger}>
                                Ban User
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {unbanModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUnbanModal(null)} />
                    <div className="relative w-full max-w-md rounded-3xl border border-black/5 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
                        <h3 className="text-lg font-bold text-slate-950 dark:text-white">Aktifkan Kembali User</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-white/45">
                            <strong className="text-slate-950 dark:text-white">{unbanModal.name}</strong> akan diaktifkan kembali dan bisa mengakses fitur sesuai role yang dimilikinya.
                        </p>
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button onClick={() => setUnbanModal(null)} className={btnOutline}>
                                Batal
                            </button>
                            <button
                                onClick={() => handleUnban(unbanModal)}
                                className={btnPrimary}
                                disabled={actionLoading === unbanModal.id}
                            >
                                {actionLoading === unbanModal.id ? "Memproses..." : "Aktifkan Kembali"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </DashboardPageShell>
    );
}

export function UserManagementTable(props: UserManagementTableProps) {
    return (
        <Suspense>
            <UserManagementTableInner {...props} />
        </Suspense>
    );
}

