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
    dashboardStackCls,
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
import { useLocale } from "@/hooks/use-locale";
import { formatDate } from "@/lib/i18n/format";

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

const emptyForm = {
    name: "",
    description: "",
    logoUrl: "",
    isActive: true,
};

export default function TeamsPage() {
    const { t, locale } = useLocale();
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
    const statusOptions = [
        { value: "ALL", label: t.dashboard.teams.statusOptions.all },
        { value: "ACTIVE", label: t.dashboard.teams.statusOptions.active },
        { value: "INACTIVE", label: t.dashboard.teams.statusOptions.inactive },
    ];
    const requestStatusOptions = [
        { value: "ALL", label: t.dashboard.teams.requestStatusOptions.all },
        { value: "PENDING", label: t.dashboard.teams.requestStatusOptions.pending },
        { value: "APPROVED", label: t.dashboard.teams.requestStatusOptions.approved },
        { value: "REJECTED", label: t.dashboard.teams.requestStatusOptions.rejected },
    ];
    const requestStatusLabel =
        t.dashboard.teams.requests.statusLabels[requestStatus as keyof typeof t.dashboard.teams.requests.statusLabels] ??
        requestStatus;

    const fetchTeams = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ search, status });
        fetch(`/api/teams?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                setTeams(data.data || []);
            })
            .catch(() => toastError(t.dashboard.teams.toasts.loadTeamsFailed))
            .finally(() => setLoading(false));
    }, [search, status, toastError, t]);

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
            .catch(() => toastError(t.dashboard.teams.toasts.loadRequestsFailed))
            .finally(() => setRequestLoading(false));
    }, [isAdmin, requestStatus, toastError, t]);

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
            toastError(data.message || t.dashboard.teams.toasts.saveFailed);
            setSaving(false);
            return;
        }

        setSaving(false);
        success(editingTeam ? t.dashboard.teams.toasts.updateSuccess : t.dashboard.teams.toasts.createSuccess);
        resetModal();
        fetchTeams();
    };

    const handleLogoUpload = async (file: File) => {
        setUploadingLogo(true);

        try {
            const body = new FormData();
            body.append("file", file);
            body.append("purpose", "logo");

            const res = await fetch("/api/upload", {
                method: "POST",
                body,
            });
            const data = await res.json();

            if (res.ok && data?.url) {
                setForm((current) => ({ ...current, logoUrl: data.url }));
                success(t.dashboard.teams.toasts.logoUploadSuccess);
            } else {
                toastError(data?.message || t.dashboard.teams.toasts.logoUploadFailed);
            }
        } catch {
            toastError(t.dashboard.teams.toasts.logoUploadNetwork);
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
                toastError(data.error || data.message || t.dashboard.teams.toasts.approveFailed);
                return;
            }

            success(t.dashboard.teams.toasts.approveSuccess(request.teamName));
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
                toastError(data.error || data.message || t.dashboard.teams.toasts.rejectFailed);
                return;
            }

            success(t.dashboard.teams.toasts.rejectSuccess(rejectTarget.teamName));
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
            toastError(data.message || t.dashboard.teams.toasts.deleteFailed);
            return;
        }

        success(t.dashboard.teams.toasts.deleteSuccess(team.name));
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
                ? t.dashboard.teams.helperAdmin
                : t.dashboard.teams.helperViewer,
        [isAdmin, t]
    );

    return (
        <DashboardPageShell>
            <div className={dashboardStackCls}>
                <DashboardPageHeader
                    kicker={t.dashboard.teams.kicker}
                    title={t.dashboard.teams.title}
                    description={t.dashboard.teams.description}
                    actions={isAdmin ? <button onClick={openCreate} className={btnPrimary}>{t.dashboard.teams.createButton}</button> : null}
                />

                {isAdmin ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <DashboardPanel title={t.dashboard.teams.requests.panelTitle} description={t.dashboard.teams.requests.panelDescription}>
                        <div className={filterBarCls}>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                                <div className="text-sm text-base-content/60">
                                    {requestLoading ? t.dashboard.teams.requests.loading : t.dashboard.teams.requests.count(requests.length)}
                                </div>
                                <FormSelect value={requestStatus} onChange={setRequestStatus} options={requestStatusOptions} className="w-full" />
                            </div>
                            {hasRequestFilter ? (
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/45">
                                    <span>{t.dashboard.teams.requests.filterActive(requestStatusLabel)}</span>
                                    <button
                                        type="button"
                                        onClick={() => setRequestStatus("ALL")}
                                        className="font-medium text-primary transition-colors hover:text-primary/80"
                                    >
                                        {t.dashboard.teams.requests.resetFilter}
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
                                title={t.dashboard.teams.requests.emptyTitle}
                                description={t.dashboard.teams.requests.emptyDescription}
                                actionLabel={hasRequestFilter ? t.dashboard.teams.requests.resetFilter : undefined}
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
                                                        {t.dashboard.teams.requests.statusLabels[request.status as keyof typeof t.dashboard.teams.requests.statusLabels] ?? request.status}
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-sm text-base-content/60">
                                                    {request.description || t.dashboard.teams.requests.descriptionEmpty}
                                                </div>
                                                <div className="mt-2 text-xs text-base-content/50">
                                                    {t.dashboard.teams.requests.byline(request.requester.fullName, request.requester.username, request.requester.email)}
                                                </div>
                                                <div className="mt-2 text-[11px] text-base-content/45">
                                                    {t.dashboard.teams.requests.submittedAt(formatDate(request.createdAt, locale))}
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
                                                            {requestActionId === request.id
                                                                ? t.dashboard.teams.requests.processing
                                                                : t.dashboard.teams.requests.approve}
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
                                                            {t.dashboard.teams.requests.reject}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-base-content/45">{t.dashboard.teams.requests.processed}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </DashboardPanel>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <DashboardMetricCard label={t.dashboard.teams.metrics.totalLabel} value={loading ? "..." : teams.length} meta={t.dashboard.teams.metrics.totalMeta} tone="accent" />
                        <DashboardMetricCard label={t.dashboard.teams.metrics.activeLabel} value={loading ? "..." : activeTeams} meta={t.dashboard.teams.metrics.activeMeta} tone="success" />
                        <DashboardMetricCard label={t.dashboard.teams.metrics.avgLabel} value={loading ? "..." : avgRoster} meta={t.dashboard.teams.metrics.avgMeta} tone="default" />
                        <DashboardMetricCard label={t.dashboard.teams.metrics.inactiveLabel} value={loading ? "..." : inactiveTeams} meta={t.dashboard.teams.metrics.inactiveMeta} tone="danger" />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <DashboardMetricCard label={t.dashboard.teams.metrics.totalLabel} value={loading ? "..." : teams.length} meta={t.dashboard.teams.metrics.viewerTotalMeta} tone="accent" />
                    <DashboardMetricCard label={t.dashboard.teams.metrics.activeLabel} value={loading ? "..." : activeTeams} meta={t.dashboard.teams.metrics.viewerActiveMeta} tone="success" />
                    <DashboardMetricCard
                        label={t.dashboard.teams.metrics.avgLabel}
                        value={loading ? "..." : avgRoster}
                        meta={`${helperText} ${inactiveTeams ? t.dashboard.teams.metrics.inactiveNotice(inactiveTeams) : ""}`.trim()}
                        tone="default"
                    />
                </div>
            )}

                <DashboardPanel
                    title={t.dashboard.teams.list.panelTitle}
                    description={t.dashboard.teams.list.panelDescription}
                    action={(
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t.dashboard.teams.list.searchPlaceholder}
                                className={`${searchInputCls} h-9 sm:w-48`}
                            />
                            <FormSelect value={status} onChange={setStatus} options={statusOptions} className="w-full sm:w-44" />
                        </div>
                    )}
                >
                    {isFiltering ? (
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/45">
                            <span>{t.dashboard.teams.list.filterSummary(teams.length)}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setStatus("ALL");
                                }}
                                className="font-medium text-primary transition-colors hover:text-primary/80"
                            >
                                {t.dashboard.teams.list.resetFilter}
                            </button>
                        </div>
                    ) : null}
                    {loading ? (
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item} className="h-44 animate-pulse rounded-box border border-base-300 bg-base-200/50" />
                            ))}
                        </div>
                    ) : teams.length === 0 ? (
                        <DashboardEmptyState
                            title={isFiltering ? t.dashboard.teams.list.emptyFilteredTitle : t.dashboard.teams.list.emptyTitle}
                            description={
                                isFiltering
                                    ? t.dashboard.teams.list.emptyFilteredDescription
                                    : t.dashboard.teams.list.emptyDescription
                            }
                            actionLabel={isFiltering ? t.dashboard.teams.list.resetFilter : undefined}
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
                                                    {team.isActive ? t.dashboard.teams.list.statusActive : t.dashboard.teams.list.statusInactive}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-sm text-base-content/60">
                                                {team.description || t.dashboard.teams.list.descriptionEmpty}
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-base-content/50">
                                                <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1">
                                                    {t.dashboard.teams.list.rosterLabel(team.memberCount)}
                                                </span>
                                                <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1">
                                                    {t.dashboard.teams.list.createdLabel(formatDate(team.createdAt, locale))}
                                                </span>
                                                <span className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1">
                                                    {t.dashboard.teams.list.updatedLabel(formatDate(team.updatedAt, locale))}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                            <Link href={`/dashboard/teams/${team.id}`} className={btnPrimary}>
                                                {t.dashboard.teams.list.detail}
                                            </Link>
                                            {isAdmin ? (
                                                <button onClick={() => openEdit(team)} className={btnOutline}>
                                                    {t.dashboard.teams.list.edit}
                                                </button>
                                            ) : null}
                                            {isAdmin ? (
                                                <div className={team.memberCount > 0 ? "tooltip tooltip-top" : ""} data-tip={t.dashboard.teams.list.deleteHint}>
                                                    <button onClick={() => setTeamToDelete(team)} className={btnDanger} disabled={team.memberCount > 0}>
                                                        {t.dashboard.teams.list.delete}
                                                    </button>
                                                </div>
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
                                {editingTeam ? t.dashboard.teams.modal.editTitle : t.dashboard.teams.modal.createTitle}
                            </h2>
                            <p className="text-xs text-base-content/55">
                                {t.dashboard.teams.modal.subtitle}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                            <div className="space-y-3">
                                <label className="block">
                                    <span className={labelCls}>{t.dashboard.teams.modal.nameLabel}</span>
                                    <input
                                        value={form.name}
                                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                        className={inputCls}
                                        placeholder={t.dashboard.teams.modal.namePlaceholder}
                                        required
                                    />
                                </label>
                            </div>

                            <label className="block">
                                <span className={labelCls}>{t.dashboard.teams.modal.descriptionLabel}</span>
                                <textarea
                                    value={form.description}
                                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                    rows={3}
                                    className={`${inputCls} resize-none`}
                                    placeholder={t.dashboard.teams.modal.descriptionPlaceholder}
                                />
                            </label>

                            <div className="space-y-3">
                                <label className={labelCls}>{t.dashboard.teams.modal.uploadLabel}</label>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
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
                                {uploadingLogo ? <p className="text-xs text-base-content/45">{t.dashboard.teams.modal.uploading}</p> : null}
                                {form.logoUrl ? (
                                    <div className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={normalizeAssetUrl(form.logoUrl) || ""}
                                            alt={t.dashboard.teams.modal.previewAlt}
                                            className="h-16 w-16 rounded-xl object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}
                                            className="text-xs font-medium text-error hover:text-error/80"
                                        >
                                            {t.dashboard.teams.modal.removeLogo}
                                        </button>
                                    </div>
                                ) : null}
                            </div>

                            <label className="block">
                                <span className={labelCls}>{t.dashboard.teams.modal.statusLabel}</span>
                                <FormSelect
                                    value={form.isActive ? "ACTIVE" : "INACTIVE"}
                                    onChange={(value) => setForm((current) => ({ ...current, isActive: value === "ACTIVE" }))}
                                    options={statusOptions.filter((option) => option.value !== "ALL")}
                                    className="w-full"
                                />
                            </label>

                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <button type="button" onClick={resetModal} className={btnOutline}>{t.dashboard.teams.modal.cancel}</button>
                                <button type="submit" className={btnPrimary} disabled={saving || uploadingLogo}>
                                    {saving
                                        ? t.dashboard.teams.modal.saving
                                        : editingTeam
                                            ? t.dashboard.teams.modal.save
                                            : t.dashboard.teams.modal.create}
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
                                {t.dashboard.teams.rejectModal.kicker}
                            </div>
                            <h2 className="text-xl font-bold text-base-content">{t.dashboard.teams.rejectModal.title}</h2>
                            <p className="text-sm leading-6 text-base-content/60">
                                {t.dashboard.teams.rejectModal.description(rejectTarget.requester.fullName, rejectTarget.teamName)}
                            </p>
                        </div>

                        <label className="mt-4 block">
                            <span className={labelCls}>{t.dashboard.teams.rejectModal.reasonLabel}</span>
                            <textarea
                                className={`${inputCls} min-h-[104px] resize-none`}
                                value={rejectReason}
                                onChange={(event) => setRejectReason(event.target.value)}
                                placeholder={t.dashboard.teams.rejectModal.reasonPlaceholder}
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
                                {t.dashboard.teams.rejectModal.cancel}
                            </button>
                            <button
                                type="button"
                                onClick={handleRejectRequest}
                                className={btnDanger}
                                disabled={requestActionId === rejectTarget.id}
                            >
                                {requestActionId === rejectTarget.id
                                    ? t.dashboard.teams.rejectModal.processing
                                    : t.dashboard.teams.rejectModal.reject}
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
                                {t.dashboard.teams.deleteModal.kicker}
                            </div>
                            <h2 className="text-xl font-bold text-base-content">{t.dashboard.teams.deleteModal.title}</h2>
                            <p className="text-sm leading-6 text-base-content/60">
                                {t.dashboard.teams.deleteModal.description(teamToDelete.name)}
                            </p>
                        </div>

                        <div className="mt-5 rounded-box border border-base-300 bg-base-200/40 p-4 text-sm">
                            <div className="font-semibold text-base-content">{teamToDelete.name}</div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-base-content/45">
                                <span>{teamToDelete.isActive ? t.dashboard.teams.deleteModal.metaActive : t.dashboard.teams.deleteModal.metaInactive}</span>
                                <span>|</span>
                                <span>{t.dashboard.teams.deleteModal.metaRoster(teamToDelete.memberCount)}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setTeamToDelete(null)} className={btnOutline}>
                                {t.dashboard.teams.deleteModal.cancel}
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
                                {t.dashboard.teams.deleteModal.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </DashboardPageShell>
    );
}
