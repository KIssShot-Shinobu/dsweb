"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { btnDanger, btnOutline, btnPrimary, filterBarCls, inputCls, labelCls, searchInputCls } from "@/components/dashboard/form-styles";
import { FormSelect } from "@/components/dashboard/form-select";
import {
    DashboardEmptyState,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { Modal } from "@/components/dashboard/modal";
import { useLocale } from "@/hooks/use-locale";
import { formatDate } from "@/lib/i18n/format";

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

type CandidateUser = {
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
    city: string | null;
    avatarUrl: string | null;
};

type SelectOption = {
    value: string;
    label: string;
};

function getInitials(name: string) {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function TeamDetailClient({ teamId }: { teamId: string }) {
    const { t, locale } = useLocale();
    const { user } = useCurrentUser();
    const roleLabels = t.teams.roles;
    const getTeamRoleLabel = useCallback(
        (role: string) => roleLabels[role as keyof typeof roleLabels] ?? role,
        [roleLabels]
    );
    const allRoleOption = useMemo<SelectOption>(
        () => ({ value: "ALL", label: t.dashboard.teamDetail.filters.roleAll }),
        [t]
    );
    const [team, setTeam] = useState<TeamDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rosterSearch, setRosterSearch] = useState("");
    const [rosterRole, setRosterRole] = useState("ALL");
    const [pendingUserId, setPendingUserId] = useState<string | null>(null);
    const [memberToUnassign, setMemberToUnassign] = useState<TeamMember | null>(null);
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignSearch, setAssignSearch] = useState("");
    const [assignRole, setAssignRole] = useState("PLAYER");
    const [assignCandidates, setAssignCandidates] = useState<CandidateUser[]>([]);
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);
    const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
    const assignSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const formatDateLabel = (value?: string | null) =>
        value ? formatDate(value, locale, { day: "2-digit", month: "short", year: "numeric" }) : t.common.notAvailable;

    const isAdmin = ["ADMIN", "FOUNDER"].includes(user?.role || "");

    const loadTeam = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/teams/${teamId}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || t.dashboard.teamDetail.errors.loadTeamFailed);
                setTeam(null);
                return;
            }

            setTeam(data.data);
        } catch {
            setError(t.dashboard.teamDetail.errors.loadTeamFailed);
            setTeam(null);
        } finally {
            setLoading(false);
        }
    }, [t, teamId]);

    useEffect(() => {
        loadTeam();
    }, [loadTeam]);

    const fetchCandidates = useCallback(async (query: string) => {
        setAssignLoading(true);
        setAssignError(null);

        try {
            const params = new URLSearchParams({
                status: "ACTIVE",
                teamId: "NO_TEAM",
                page: "1",
                perPage: "8",
            });
            if (query.trim()) {
                params.set("search", query.trim());
            }

            const response = await fetch(`/api/users?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) {
                setAssignError(data.message || t.dashboard.teamDetail.errors.loadUsersFailed);
                setAssignCandidates([]);
                return;
            }

            setAssignCandidates(data.data || []);
        } catch {
            setAssignError(t.dashboard.teamDetail.errors.loadUsersFailed);
            setAssignCandidates([]);
        } finally {
            setAssignLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (!assignOpen) return;
        fetchCandidates(assignSearch);
    }, [assignOpen, fetchCandidates]);

    useEffect(() => () => {
        if (assignSearchTimeoutRef.current) clearTimeout(assignSearchTimeoutRef.current);
    }, []);

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
                setError(data.message || t.dashboard.teamDetail.errors.unassignFailed);
                return;
            }

            setMessage(data.message || t.dashboard.teamDetail.success.rosterUpdated);
            await loadTeam();
        } catch {
            setError(t.dashboard.teamDetail.errors.unassignFailed);
        } finally {
            setPendingUserId(null);
            setMemberToUnassign(null);
        }
    };

    const handleAssign = async (userId: string) => {
        setAssigningUserId(userId);
        setAssignError(null);
        setMessage(null);
        setError(null);

        try {
            const response = await fetch(`/api/teams/${teamId}/roster`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: assignRole }),
            });
            const data = await response.json();

            if (!response.ok) {
                setAssignError(data.message || t.dashboard.teamDetail.errors.assignFailed);
                return;
            }

            setMessage(data.message || t.dashboard.teamDetail.success.rosterAdded);
            await loadTeam();
            await fetchCandidates(assignSearch);
        } catch {
            setAssignError(t.dashboard.teamDetail.errors.assignFailed);
        } finally {
            setAssigningUserId(null);
        }
    };

    const rosterRoleOptions = useMemo(() => {
        if (!team) return [allRoleOption];
        return [
            allRoleOption,
            ...Array.from(new Set(team.members.map((member) => member.role))).map((role) => ({
                value: role,
                label: getTeamRoleLabel(role),
            })),
        ];
    }, [allRoleOption, getTeamRoleLabel, team]);

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
    const assignRoleOptions = useMemo<SelectOption[]>(
        () => [
            { value: "PLAYER", label: getTeamRoleLabel("PLAYER") },
            { value: "VICE_CAPTAIN", label: getTeamRoleLabel("VICE_CAPTAIN") },
            { value: "MANAGER", label: getTeamRoleLabel("MANAGER") },
            { value: "COACH", label: getTeamRoleLabel("COACH") },
        ],
        [getTeamRoleLabel]
    );

    const closeAssignModal = () => {
        setAssignOpen(false);
        setAssignSearch("");
        setAssignRole("PLAYER");
        setAssignCandidates([]);
        setAssignError(null);
        if (assignSearchTimeoutRef.current) {
            clearTimeout(assignSearchTimeoutRef.current);
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-5 lg:space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.teamDetail.kicker}
                    title={loading ? t.dashboard.teamDetail.loadingTitle : team?.name || t.dashboard.teamDetail.titleFallback}
                    description={
                        team?.description ||
                        t.dashboard.teamDetail.descriptionFallback
                    }
                    actions={
                        <>
                            <Link href="/dashboard/teams" className={btnOutline}>
                                {t.dashboard.teamDetail.actions.backToTeams}
                            </Link>
                            <Link href="/dashboard/users" className={btnOutline}>
                                {t.dashboard.teamDetail.actions.openUsers}
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
                    title={t.dashboard.teamDetail.summary.title}
                    description={t.dashboard.teamDetail.summary.description}
                >
                    {loading ? (
                        <div className="h-40 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                    ) : !team ? (
                        <DashboardEmptyState
                            title={t.dashboard.teamDetail.empty.title}
                            description={t.dashboard.teamDetail.empty.description}
                            actionHref="/dashboard/teams"
                            actionLabel={t.dashboard.teamDetail.actions.back}
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
                                                {team.isActive ? t.dashboard.teamDetail.status.active : t.dashboard.teamDetail.status.inactive}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-6 text-base-content/60">
                                            {team.description || t.dashboard.teamDetail.summary.descriptionFallback}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm">
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1 border-b border-base-300 pb-3">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">{t.dashboard.teamDetail.summary.labels.status}</span>
                                        <span className="text-base font-bold text-base-content">
                                            {team.isActive ? t.dashboard.teamDetail.status.active : t.dashboard.teamDetail.status.inactive}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 border-b border-base-300 pb-3">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">{t.dashboard.teamDetail.summary.labels.roster}</span>
                                        <span className="text-base font-bold text-base-content">{t.dashboard.teamDetail.summary.rosterCount(team.memberCount)}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 border-b border-base-300 pb-3">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">{t.dashboard.teamDetail.summary.labels.created}</span>
                                        <span className="text-base font-bold text-base-content">{formatDateLabel(team.createdAt)}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">{t.dashboard.teamDetail.summary.labels.updated}</span>
                                        <span className="text-base font-bold text-base-content">{formatDateLabel(team.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DashboardPanel>

                <DashboardPanel
                    title={t.dashboard.teamDetail.roster.title}
                    description={t.dashboard.teamDetail.roster.description}
                    action={isAdmin ? (
                        <button className={btnPrimary} onClick={() => setAssignOpen(true)}>
                            {t.dashboard.teamDetail.roster.add}
                        </button>
                    ) : null}
                >
                    <div className={filterBarCls}>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                            <input
                                type="text"
                                value={rosterSearch}
                                onChange={(event) => setRosterSearch(event.target.value)}
                                placeholder={t.dashboard.teamDetail.filters.searchPlaceholder}
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
                                <span>{t.dashboard.teamDetail.filters.activeCount(filteredRoster.length)}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRosterSearch("");
                                        setRosterRole("ALL");
                                    }}
                                    className="font-medium text-primary transition-colors hover:text-primary/80"
                                >
                                    {t.dashboard.teamDetail.filters.reset}
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {!team ? null : filteredRoster.length === 0 ? (
                        <div className="mt-4">
                            <DashboardEmptyState
                                title={hasRosterFilters ? t.dashboard.teamDetail.roster.emptyFilteredTitle : t.dashboard.teamDetail.roster.emptyTitle}
                                description={
                                    hasRosterFilters
                                        ? t.dashboard.teamDetail.roster.emptyFilteredDescription
                                        : t.dashboard.teamDetail.roster.emptyDescription
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
                                                        {getTeamRoleLabel(member.role)}
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-sm text-base-content/60">{member.email}</div>
                                                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-base-content/45 sm:grid-cols-2">
                                                    <div>{t.dashboard.teamDetail.roster.cityLabel(member.city || t.dashboard.teamDetail.roster.cityEmpty)}</div>
                                                    <div>{t.dashboard.teamDetail.roster.joinedTeamLabel(formatDateLabel(member.teamJoinedAt))}</div>
                                                    <div>{t.dashboard.teamDetail.roster.lastActiveLabel(formatDateLabel(member.lastActiveAt))}</div>
                                                    <div>{t.dashboard.teamDetail.roster.joinedAccountLabel(formatDateLabel(member.createdAt))}</div>
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
                                                {pendingUserId === member.id ? t.dashboard.teamDetail.actions.processing : t.dashboard.teamDetail.actions.unassign}
                                            </button>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </DashboardPanel>

            </div>

            <Modal open={assignOpen} onClose={closeAssignModal} title={t.dashboard.teamDetail.assign.title} size="md">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                        <div>
                            <label className={labelCls}>{t.dashboard.teamDetail.assign.searchLabel}</label>
                            <input
                                type="text"
                                value={assignSearch}
                                onChange={(event) => {
                                    const nextValue = event.target.value;
                                    setAssignSearch(nextValue);
                                    if (assignSearchTimeoutRef.current) clearTimeout(assignSearchTimeoutRef.current);
                                    assignSearchTimeoutRef.current = setTimeout(() => {
                                        fetchCandidates(nextValue);
                                    }, 250);
                                }}
                                placeholder={t.dashboard.teamDetail.assign.searchPlaceholder}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t.dashboard.teamDetail.assign.roleLabel}</label>
                            <FormSelect value={assignRole} onChange={setAssignRole} options={assignRoleOptions} />
                        </div>
                    </div>

                    {assignError ? (
                        <div className="rounded-box border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
                            {assignError}
                        </div>
                    ) : null}

                    {assignLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="h-16 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                            ))}
                        </div>
                    ) : assignCandidates.length === 0 ? (
                        <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-6 text-center text-sm text-base-content/60">
                            {t.dashboard.teamDetail.assign.empty}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {assignCandidates.map((candidate) => (
                                <div key={candidate.id} className="flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-200/40 px-3 py-2">
                                    <div className="flex min-w-0 items-center gap-3">
                                        {normalizeAssetUrl(candidate.avatarUrl) ? (
                                            <Image
                                                unoptimized
                                                src={normalizeAssetUrl(candidate.avatarUrl) || undefined}
                                                alt={candidate.fullName}
                                                width={40}
                                                height={40}
                                                className="h-10 w-10 rounded-2xl border border-base-300 object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-xs font-bold text-primary">
                                                {getInitials(candidate.fullName)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-base-content">{candidate.fullName}</div>
                                            <div className="truncate text-xs text-base-content/60">{candidate.email}</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleAssign(candidate.id)}
                                        className={btnOutline}
                                        disabled={assigningUserId === candidate.id}
                                    >
                                        {assigningUserId === candidate.id ? t.dashboard.teamDetail.assign.adding : t.dashboard.teamDetail.assign.add}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {memberToUnassign ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => (pendingUserId ? null : setMemberToUnassign(null))}
                    />
                    <div className="relative w-full max-w-lg rounded-box border border-base-300 bg-base-100 p-6 shadow-2xl">
                        <div className="space-y-2">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                                {t.dashboard.teamDetail.unassign.kicker}
                            </div>
                            <h3 className="text-xl font-bold text-base-content">
                                {t.dashboard.teamDetail.unassign.title}
                            </h3>
                            <p className="text-sm leading-6 text-base-content/60">
                                {t.dashboard.teamDetail.unassign.description(
                                    memberToUnassign.fullName,
                                    team?.name || t.dashboard.teamDetail.unassign.teamFallback
                                )}
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
                                        <span>{getTeamRoleLabel(memberToUnassign.role)}</span>
                                        <span>|</span>
                                        <span>{memberToUnassign.city || t.dashboard.teamDetail.roster.cityEmpty}</span>
                                        <span>|</span>
                                        <span>{t.dashboard.teamDetail.roster.joinedTeamLabel(formatDateLabel(memberToUnassign.teamJoinedAt))}</span>
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
                                {t.common.cancel}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUnassign(memberToUnassign.id)}
                                className={btnDanger}
                                disabled={pendingUserId === memberToUnassign.id}
                            >
                                {pendingUserId === memberToUnassign.id ? t.dashboard.teamDetail.actions.processing : t.dashboard.teamDetail.unassign.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </DashboardPageShell>
    );
}
