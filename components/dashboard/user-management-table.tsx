"use client";

import Image from "next/image";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { FormSelect } from "@/components/dashboard/form-select";
import { Pagination } from "@/components/dashboard/pagination";
import {
    btnDanger,
    btnOutline,
    btnPrimary,
    dashboardStackCls,
    inputCls,
    searchInputCls,
} from "@/components/dashboard/form-styles";
import {
    DashboardEmptyState,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { useLocale } from "@/hooks/use-locale";
import { formatDate } from "@/lib/i18n/format";

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
    ACTIVE: "border-success/20 bg-success/10 text-success",
    BANNED: "border-error/20 bg-error/10 text-error",
};

const ROLE_COLORS: Record<string, string> = {
    USER: "text-base-content/60",
    MEMBER: "text-info",
    OFFICER: "text-secondary",
    ADMIN: "text-warning",
    FOUNDER: "text-error",
};

const ROLE_OPTIONS = ["USER", "MEMBER", "OFFICER", "ADMIN"];
const FILTER_ROLE_OPTIONS = ["ALL", "USER", "MEMBER", "OFFICER", "ADMIN", "FOUNDER"];

function RoleDropdown({
    userId,
    currentRole,
    currentStatus,
    onChanged,
    onFeedback,
    getRoleLabel,
    labels,
    messages,
}: {
    userId: string;
    currentRole: string;
    currentStatus: string;
    onChanged: () => void;
    onFeedback: (feedback: { type: "success" | "error"; message: string }) => void;
    getRoleLabel: (role: string) => string;
    labels: { current: string };
    messages: { updateFailed: string; updateSuccess: (role: string) => string };
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
            }),
        });
        const data = await response.json();
        setLoading(false);
        if (!response.ok) {
            onFeedback({ type: "error", message: data.message || messages.updateFailed });
            return;
        }
        onFeedback({
            type: "success",
            message: data.message || messages.updateSuccess(getRoleLabel(newRole)),
        });
        onChanged();
    };

    return (
        <div className="relative flex-shrink-0">
            <button
                onClick={() => setOpen((value) => !value)}
                disabled={loading}
                className={`flex items-center gap-1 rounded-box border border-current/20 bg-base-100 px-2.5 py-1.5 text-[10px] font-bold uppercase transition-all hover:bg-base-200 disabled:opacity-50 ${ROLE_COLORS[currentRole] || "text-base-content/60"}`}
            >
                {loading ? "..." : getRoleLabel(currentRole)}
                <svg className={`h-3 w-3 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open ? (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 min-w-[132px] overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-2xl">
                        {ROLE_OPTIONS.map((role) => (
                            <button
                                key={role}
                                onClick={() => changeRole(role)}
                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase transition-all ${
                                    role === currentRole
                                        ? `${ROLE_COLORS[role]} bg-base-200`
                                        : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
                                }`}
                            >
                                {role === currentRole ? <span className="text-[8px]">{labels.current}</span> : null}
                                {getRoleLabel(role)}
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
    const { t, locale } = useLocale();
    const searchParams = useSearchParams();
    const router = useRouter();
    const roleLabels = t.dashboard.userManagement.roleLabels;
    const statusLabels = t.dashboard.userManagement.statusLabels;
    const getRoleLabel = useCallback(
        (role: string) => roleLabels[role as keyof typeof roleLabels] ?? role,
        [roleLabels]
    );
    const getStatusLabel = useCallback(
        (status: string) => statusLabels[status as keyof typeof statusLabels] ?? status,
        [statusLabels]
    );

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
    const [unbanModal, setUnbanModal] = useState<{ id: string; name: string; role: string } | null>(null);
    const [detailModal, setDetailModal] = useState<UserRow | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [reason, setReason] = useState("");
    const [searchInput, setSearchInput] = useState(search);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const formatUserDate = (value: string) => formatDate(value, locale);

    const perPage = 15;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const statusFilterOptions = useMemo(
        () => [
            { value: "ALL", label: t.dashboard.userManagement.filters.statusAll },
            { value: "ACTIVE", label: t.dashboard.userManagement.filters.statusActive },
            { value: "BANNED", label: t.dashboard.userManagement.filters.statusBanned },
        ],
        [t]
    );
    const roleFilterOptions = useMemo(
        () =>
            FILTER_ROLE_OPTIONS.map((role) => ({
                value: role,
                label: role === "ALL" ? t.dashboard.userManagement.filters.roleAll : getRoleLabel(role),
            })),
        [getRoleLabel, t]
    );
    const teamFilterOptions = useMemo(
        () => [
            { value: "ALL", label: t.dashboard.userManagement.filters.teamAll },
            { value: "NO_TEAM", label: t.dashboard.userManagement.filters.teamNone },
            ...teams.map((team) => ({ value: team.id, label: team.name })),
        ],
        [t, teams]
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

    const setParam = useCallback((key: string, value: string) => {
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
    }, [defaultRole, defaultStatus, lockRole, lockStatus, router, searchParams]);

    const fetchUsers = useCallback(() => {
        setLoading(true);
        fetch(`/api/users?${paramsString}`)
            .then((response) => response.json())
            .then((data) => {
                setUsers(data.data || []);
                setTotal(data.total || 0);
                setTeams(data.filters?.teams || []);
            })
            .finally(() => setLoading(false));
    }, [paramsString]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchInput !== search) {
                setParam("search", searchInput);
            }
        }, 250);

        return () => clearTimeout(timeoutId);
    }, [search, searchInput, setParam]);

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
            setFeedback({ type: "error", message: data.message || t.dashboard.userManagement.messages.banFailed });
            return;
        }
        setFeedback({ type: "success", message: data.message || t.dashboard.userManagement.messages.banSuccess });
        setBanModal(null);
        setReason("");
        fetchUsers();
    };

    const handleUnban = async (user: { id: string; name: string; role: string }) => {
        setActionLoading(user.id);
        setFeedback(null);
        const response = await fetch(`/api/users/${user.id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ACTIVE", role: user.role }),
        });
        const data = await response.json();
        setActionLoading(null);
        if (!response.ok) {
            setFeedback({ type: "error", message: data.message || t.dashboard.userManagement.messages.unbanFailed });
            return;
        }
        setFeedback({ type: "success", message: data.message || t.dashboard.userManagement.messages.unbanSuccess });
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
            <div className={dashboardStackCls}>
                <DashboardPageHeader kicker={t.dashboard.userManagement.kicker} title={title} description={description} />

                {feedback ? (
                    <div
                        className={`rounded-box border px-4 py-3 text-sm ${
                            feedback.type === "success"
                                ? "border-success/20 bg-success/10 text-success"
                                : "border-error/20 bg-error/10 text-error"
                        }`}
                    >
                        {feedback.message}
                    </div>
                ) : null}

                <DashboardPanel
                    title={t.dashboard.userManagement.panel.title}
                    description={t.dashboard.userManagement.panel.description(total)}
                    action={(
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder={t.dashboard.userManagement.filters.searchPlaceholder}
                                className={`${searchInputCls} h-9 sm:w-56`}
                            />
                            {!lockStatus ? (
                                <FormSelect value={statusFilter} onChange={(value) => setParam("status", value)} options={statusFilterOptions} className="w-full sm:w-32" />
                            ) : null}
                            {!lockRole ? (
                                <FormSelect value={roleFilter} onChange={(value) => setParam("role", value)} options={roleFilterOptions} className="w-full sm:w-32" />
                            ) : null}
                            <FormSelect value={teamFilter} onChange={(value) => setParam("teamId", value)} options={teamFilterOptions} className="w-full sm:w-44" />
                            {hasActiveFilters ? (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className={`${btnOutline} btn-sm`}
                                >
                                    {t.dashboard.userManagement.filters.reset}
                                </button>
                            ) : null}
                        </div>
                    )}
                >
                    {hasActiveFilters ? (
                        <div className="mb-3 text-xs text-base-content/45">
                            {t.dashboard.userManagement.filters.activeCount(total)}
                        </div>
                    ) : null}
                    <div className="mb-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                            {t.dashboard.userManagement.metrics.visible}: {loading ? "..." : users.length}
                        </span>
                        <span className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[11px] font-semibold text-success">
                            {t.dashboard.userManagement.metrics.active}: {loading ? "..." : visibleActiveCount}
                        </span>
                        <span className="rounded-full border border-base-300 bg-base-100 px-3 py-1 text-[11px] font-semibold text-base-content/60">
                            {t.dashboard.userManagement.metrics.members}: {loading ? "..." : visibleMemberCount}
                        </span>
                        <span className="rounded-full border border-error/20 bg-error/10 px-3 py-1 text-[11px] font-semibold text-error">
                            {t.dashboard.userManagement.metrics.noTeam}: {loading ? "..." : withoutTeamCount}
                        </span>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="h-24 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                            ))}
                        </div>
                    ) : users.length === 0 ? (
                        <DashboardEmptyState
                            title={hasActiveFilters ? t.dashboard.userManagement.empty.filteredTitle : emptyTitle}
                            description={
                                hasActiveFilters
                                    ? t.dashboard.userManagement.empty.filteredDescription
                                    : emptyDescription
                            }
                        />
                    ) : (
                        <div className="space-y-2">
                            {users.map((user) => (
                                <div key={user.id} className="flex flex-col gap-2 rounded-box border border-base-300 bg-base-200/40 p-2 shadow-sm transition-all hover:border-primary/20 hover:bg-base-100 sm:p-3 xl:flex-row xl:items-center">
                                    <div className="flex items-center gap-3 xl:w-[260px] xl:flex-shrink-0">
                                        {normalizeAssetUrl(user.avatarUrl) ? (
                                            <Image
                                                unoptimized
                                                src={normalizeAssetUrl(user.avatarUrl) || undefined}
                                                alt={user.fullName}
                                                width={40}
                                                height={40}
                                                className="h-10 w-10 flex-shrink-0 rounded-2xl border border-base-300 object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-sm font-bold text-primary">
                                                {getInitials(user.fullName)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-base-content">{user.fullName}</div>
                                            {user.gameProfiles.length > 0 ? (
                                                <div className="mt-1 flex flex-wrap gap-1.5">
                                                    {user.gameProfiles.map((profile) => (
                                                        <span key={`${user.id}-${profile.gameType}`} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                                                            {profile.ign}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex flex-1 flex-wrap items-center gap-2 md:grid md:grid-cols-[120px_140px_200px_40px] md:items-center md:gap-3">
                                        <div className="flex items-center gap-2 md:justify-start">
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${STATUS_COLORS[user.status] || ""}`}>
                                                {getStatusLabel(user.status)}
                                            </span>
                                        </div>

                                        <div className="flex items-center md:justify-end">
                                            <RoleDropdown
                                                userId={user.id}
                                                currentRole={user.role}
                                                currentStatus={user.status}
                                                onChanged={fetchUsers}
                                                onFeedback={setFeedback}
                                                getRoleLabel={getRoleLabel}
                                                labels={{ current: t.dashboard.userManagement.roleCurrent }}
                                                messages={{
                                                    updateFailed: t.dashboard.userManagement.messages.roleUpdateFailed,
                                                    updateSuccess: t.dashboard.userManagement.messages.roleUpdateSuccess,
                                                }}
                                            />
                                        </div>

                                        <div className="flex flex-wrap items-center justify-end gap-2 md:justify-end">
                                            {user.team ? (
                                                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-500">
                                                    {user.team.name}
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="flex justify-start md:justify-end pr-2">
                                            <div className={`dropdown dropdown-end ${openMenuId === user.id ? "dropdown-open" : ""}`}>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-circle btn-sm"
                                                    aria-label={t.dashboard.userManagement.actions.menu}
                                                    onClick={() => setOpenMenuId((current) => (current === user.id ? null : user.id))}
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                                {openMenuId === user.id ? (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                        <ul className="menu dropdown-content z-[60] mt-2 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl">
                                                            <li>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setDetailModal(user);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                >
                                                                    {t.dashboard.userManagement.actions.viewDetails}
                                                                </button>
                                                            </li>
                                                            {user.team ? (
                                                                <li>
                                                                    <Link href={`/dashboard/teams/${user.team.id}`} onClick={() => setOpenMenuId(null)}>
                                                                        {t.dashboard.userManagement.actions.viewTeam}
                                                                    </Link>
                                                                </li>
                                                            ) : null}
                                                            {user.status === "ACTIVE" && user.role !== "FOUNDER" ? (
                                                                <li>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setBanModal({ id: user.id, name: user.fullName });
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        disabled={actionLoading === user.id}
                                                                        title={t.dashboard.userManagement.actions.banTitle}
                                                                        className="text-error"
                                                                    >
                                                                        {t.dashboard.userManagement.actions.ban}
                                                                    </button>
                                                                </li>
                                                            ) : null}
                                                            {user.status === "BANNED" ? (
                                                                <li>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setUnbanModal({ id: user.id, name: user.fullName, role: user.role });
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        disabled={actionLoading === user.id}
                                                                        title={t.dashboard.userManagement.actions.unbanTitle}
                                                                        className="text-success"
                                                                    >
                                                                        {t.dashboard.userManagement.actions.unban}
                                                                    </button>
                                                                </li>
                                                            ) : null}
                                                        </ul>
                                                    </>
                                                ) : null}
                                            </div>
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
                    <div className="relative w-full max-w-md rounded-box border border-base-300 bg-base-100 p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-base-content">{t.dashboard.userManagement.banModal.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-base-content/60">
                            {t.dashboard.userManagement.banModal.description(banModal.name)}
                        </p>
                        <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder={t.dashboard.userManagement.banModal.reasonPlaceholder}
                            rows={4}
                            className={`${inputCls} mt-4 resize-none`}
                        />
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button onClick={() => setBanModal(null)} className={btnOutline}>
                                {t.common.cancel}
                            </button>
                            <button onClick={() => handleBan(banModal.id, reason)} className={btnDanger}>
                                {t.dashboard.userManagement.banModal.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {unbanModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUnbanModal(null)} />
                    <div className="relative w-full max-w-md rounded-box border border-base-300 bg-base-100 p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-base-content">{t.dashboard.userManagement.unbanModal.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-base-content/60">
                            {t.dashboard.userManagement.unbanModal.description(unbanModal.name)}
                        </p>
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button onClick={() => setUnbanModal(null)} className={btnOutline}>
                                {t.common.cancel}
                            </button>
                            <button
                                onClick={() => handleUnban(unbanModal)}
                                className={btnPrimary}
                                disabled={actionLoading === unbanModal.id}
                            >
                                {actionLoading === unbanModal.id ? t.dashboard.userManagement.actions.processing : t.dashboard.userManagement.unbanModal.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {detailModal ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailModal(null)} />
                    <div className="relative w-full max-w-lg rounded-box border border-base-300 bg-base-100 p-6 shadow-2xl">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-base-content">{t.dashboard.userManagement.details.title}</h3>
                            <p className="mt-1 text-sm text-base-content/60">{detailModal.fullName}</p>
                        </div>
                        <div className="space-y-4 text-sm text-base-content/70">
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">
                                    {t.dashboard.userManagement.details.email}
                                </span>
                                <span className="text-base-content">{detailModal.email}</span>
                            </div>
                            {detailModal.city ? (
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">
                                        {t.dashboard.userManagement.details.city}
                                    </span>
                                    <span className="text-base-content">{detailModal.city}</span>
                                </div>
                            ) : null}
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">
                                    {t.dashboard.userManagement.details.joinedAt}
                                </span>
                                <span className="text-base-content">{formatUserDate(detailModal.createdAt)}</span>
                            </div>
                            {detailModal.gameProfiles.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">
                                        {t.dashboard.userManagement.details.gameProfiles}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {detailModal.gameProfiles.map((profile) => (
                                            <span key={`${detailModal.id}-${profile.gameType}`} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                                {profile.ign}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            {detailModal.team ? (
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">
                                        {t.dashboard.userManagement.details.team}
                                    </span>
                                    <span className="text-base-content">{detailModal.team.name}</span>
                                </div>
                            ) : null}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setDetailModal(null)} className={btnOutline}>
                                {t.common.close}
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

