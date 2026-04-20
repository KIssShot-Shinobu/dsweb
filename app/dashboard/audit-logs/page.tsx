"use client";

import { useEffect, useMemo, useState } from "react";
import { FormSelect } from "@/components/dashboard/form-select";
import { Pagination } from "@/components/dashboard/pagination";
import { btnOutline, btnPrimary, dashboardStackCls, filterBarCls, searchInputCls } from "@/components/dashboard/form-styles";
import {
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { useLocale } from "@/hooks/use-locale";
import { formatDateTime } from "@/lib/i18n/format";

type AuditLog = {
    id: string;
    userId: string | null;
    action: string;
    targetId: string | null;
    targetType: string | null;
    ipAddress: string;
    userAgent: string | null;
    details: string | null;
    reason: string | null;
    requestPath: string | null;
    requestMethod: string | null;
    responseStatus: number | null;
    createdAt: string;
    user?: {
        fullName: string;
        email: string;
    } | null;
};

const ACTION_VALUES = [
    "ALL",
    "LOGIN_SUCCESS",
    "LOGIN_FAILED",
    "USER_REGISTERED",
    "USER_APPROVED",
    "USER_BANNED",
    "PASSWORD_RESET_SUCCESS",
    "OAUTH_GOOGLE_LOGIN_SUCCESS",
    "OAUTH_GOOGLE_ACCOUNT_LINKED",
    "OAUTH_GOOGLE_ACCOUNT_CREATED",
    "OAUTH_DISCORD_LOGIN_SUCCESS",
    "OAUTH_DISCORD_ACCOUNT_LINKED",
    "OAUTH_DISCORD_ACCOUNT_CREATED",
    "SENSITIVE_FIELD_CHANGED",
    "TOURNAMENT_REGISTERED",
    "TOURNAMENT_STARTED",
    "TOURNAMENT_CHECKIN_UPDATED",
    "TOURNAMENT_PARTICIPANT_UPDATED",
    "TOURNAMENT_PARTICIPANT_REMOVED",
    "TOURNAMENT_PARTICIPANT_CHECKIN_TOGGLED",
    "TOURNAMENT_PARTICIPANT_DISQUALIFIED",
    "TEAM_JOIN_REQUEST_AUTO_DECLINED",
    "TOURNAMENT_WAITLISTED",
    "TOURNAMENT_WAITLIST_PROMOTED",
    "TOURNAMENT_ANNOUNCEMENT_CREATED",
    "TOURNAMENT_ANNOUNCEMENT_UPDATED",
    "TOURNAMENT_ANNOUNCEMENT_DELETED",
    "REFEREE_ASSIGNED",
    "REFEREE_REMOVED",
    "MATCH_REPORTED",
    "MATCH_CONFIRMED",
    "MATCH_CONFIRMED_BY_REFEREE",
    "MATCH_ADMIN_RESOLVED",
    "MATCH_DISPUTE_RESOLVED",
    "MATCH_SCHEDULED",
    "MATCH_RESCHEDULED",
    "MATCH_FORFEITED",
    "MATCH_STARTED",
    "MATCH_LINEUP_SUBMITTED",
    "MATCH_LINEUP_UPDATED",
    "RATE_LIMIT_HIT",
    "ROLE_CHANGED",
    "TREASURY_ADDED",
    "TREASURY_UPDATED",
    "TREASURY_DELETED",
] as const;

const PAGE_SIZE_VALUES = [10, 20, 50];

function useAuditLogs(
    page: number,
    limit: number,
    actionFilter: string,
    search: string,
    dateRange: { start: string; end: string }
) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: String(page),
                    limit: String(limit),
                });

                if (actionFilter && actionFilter !== "ALL") params.set("action", actionFilter);
                if (search.trim()) params.set("search", search.trim());
                if (dateRange.start) params.set("startDate", dateRange.start);
                if (dateRange.end) params.set("endDate", dateRange.end);

                const res = await fetch(`/api/audit-logs?${params.toString()}`);
                const json = await res.json();

                if (json.success) {
                    setLogs(json.data || []);
                    setTotal(json.total || 0);
                } else {
                    setLogs([]);
                    setTotal(0);
                }
            } catch {
                setLogs([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [page, limit, actionFilter, search, dateRange]);

    return { logs, total, loading };
}

const formatDetails = (detailsStr: string | null) => {
    if (!detailsStr) return "-";
    try {
        const obj = JSON.parse(detailsStr) as Record<string, unknown>;
        return Object.entries(obj)
            .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
            .join(", ");
    } catch {
        return detailsStr;
    }
};

const getActionBadgeColor = (action: string) => {
    if (action.startsWith("OAUTH_GOOGLE") || action.startsWith("OAUTH_DISCORD")) {
        return "border-success/20 bg-success/10 text-success";
    }
    if (action.includes("SUCCESS") || action.includes("APPROVED") || action.includes("REGISTERED")) {
        return "border-success/20 bg-success/10 text-success";
    }
    if (action.includes("FAILED") || action.includes("BANNED")) {
        return "border-error/20 bg-error/10 text-error";
    }
    if (action.includes("UPDATED") || action.includes("CHANGED")) {
        return "border-info/20 bg-info/10 text-info";
    }
    return "border-warning/20 bg-warning/10 text-warning";
};

export default function AuditLogsPage() {
    const { locale, t } = useLocale();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState("20");
    const [actionFilter, setActionFilter] = useState("ALL");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");
    const [appliedDateRange, setAppliedDateRange] = useState({ start: "", end: "" });
    const [exportMessage, setExportMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

    const actionOptions = useMemo(
        () =>
            ACTION_VALUES.map((value) => ({
                value,
                label: value === "ALL" ? t.dashboard.auditLogs.actionAll : t.dashboard.auditLogs.actionLabels[value],
            })),
        [t]
    );

    const actionLabels = useMemo(
        () =>
            Object.fromEntries(
                ACTION_VALUES.filter((value) => value !== "ALL").map((value) => [
                    value,
                    t.dashboard.auditLogs.actionLabels[value as keyof typeof t.dashboard.auditLogs.actionLabels],
                ])
            ) as Record<string, string>,
        [t]
    );

    const pageSizeOptions = useMemo(
        () => PAGE_SIZE_VALUES.map((value) => ({ value: String(value), label: t.dashboard.auditLogs.pageSizeLabel(value) })),
        [t]
    );

    const limitValue = Math.max(1, Number(limit) || 20);
    const { logs, total, loading } = useAuditLogs(page, limitValue, actionFilter, search, appliedDateRange);
    const totalPages = Math.max(1, Math.ceil(total / limitValue));
    const formatLogDate = (dateString: string) =>
        formatDateTime(dateString, locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const summary = useMemo(
        () => ({
            failed: logs.filter((log) => log.action.includes("FAILED") || log.action.includes("BANNED")).length,
            sensitive: logs.filter((log) => log.action === "SENSITIVE_FIELD_CHANGED").length,
            auth: logs.filter((log) => log.action.startsWith("LOGIN") || log.action.startsWith("PASSWORD_") || log.action.startsWith("OAUTH_GOOGLE") || log.action.startsWith("OAUTH_DISCORD")).length,
        }),
        [logs]
    );

    const applyFilters = () => {
        setPage(1);
        setSearch(searchInput);
        setAppliedDateRange({ start: dateStart, end: dateEnd });
    };

    const handleExportCsv = async () => {
        setExportMessage(null);
        const params = new URLSearchParams();
        if (actionFilter !== "ALL") params.set("action", actionFilter);
        if (search.trim()) params.set("search", search.trim());
        if (appliedDateRange.start) params.set("startDate", appliedDateRange.start);
        if (appliedDateRange.end) params.set("endDate", appliedDateRange.end);

        try {
            const res = await fetch(`/api/audit-logs/export?${params.toString()}`);
            if (!res.ok) {
                const json = await res.json().catch(() => null);
                setExportMessage({
                    type: "error",
                    text: json?.message || t.dashboard.auditLogs.export.failed,
                });
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "audit_logs.csv";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
            setExportMessage({
                type: "success",
                text: t.dashboard.auditLogs.export.success,
            });
        } catch {
            setExportMessage({
                type: "error",
                text: t.dashboard.auditLogs.export.network,
            });
        }
    };

    return (
        <DashboardPageShell>
            <div className={dashboardStackCls}>
                <DashboardPageHeader
                    kicker={t.dashboard.auditLogs.kicker}
                    title={t.dashboard.auditLogs.title}
                    description={t.dashboard.auditLogs.description}
                    actions={
                        <button onClick={handleExportCsv} className={btnOutline}>
                            {t.dashboard.auditLogs.actions.exportCsv}
                        </button>
                    }
                />

                {exportMessage ? (
                    <div className={`rounded-box border px-4 py-3 text-sm ${exportMessage.type === "success" ? "border-success/20 bg-success/10 text-success" : "border-error/20 bg-error/10 text-error"}`}>
                        {exportMessage.text}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <DashboardMetricCard
                        label={t.dashboard.auditLogs.metrics.pageLogsLabel}
                        value={loading ? "..." : logs.length}
                        meta={t.dashboard.auditLogs.metrics.pageLogsMeta}
                        tone="accent"
                    />
                    <DashboardMetricCard
                        label={t.dashboard.auditLogs.metrics.riskyLabel}
                        value={loading ? "..." : summary.failed}
                        meta={t.dashboard.auditLogs.metrics.riskyMeta}
                        tone="danger"
                    />
                    <DashboardMetricCard
                        label={t.dashboard.auditLogs.metrics.authLabel}
                        value={loading ? "..." : summary.auth + summary.sensitive}
                        meta={t.dashboard.auditLogs.metrics.authMeta}
                        tone="success"
                    />
                </div>

                <DashboardPanel title={t.dashboard.auditLogs.filters.title} description={t.dashboard.auditLogs.filters.description}>
                    <div className={filterBarCls}>
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[220px_minmax(0,1fr)_160px_160px_150px_auto]">
                            <FormSelect value={actionFilter} onChange={(value) => { setActionFilter(value); setPage(1); }} options={actionOptions} />
                            <input
                                type="text"
                                placeholder={t.dashboard.auditLogs.filters.searchPlaceholder}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                                className={searchInputCls}
                            />
                            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className={searchInputCls} />
                            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={searchInputCls} />
                            <FormSelect
                                value={limit}
                                onChange={(value) => {
                                    setLimit(value);
                                    setPage(1);
                                }}
                                options={pageSizeOptions}
                            />
                            <button onClick={applyFilters} className={btnPrimary}>
                                {t.dashboard.auditLogs.filters.apply}
                            </button>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title={t.dashboard.auditLogs.list.title} description={t.dashboard.auditLogs.list.description(total)}>
                    {loading ? (
                        <div className="rounded-box border border-base-300 bg-base-200/40 px-5 py-12 text-center text-sm text-base-content/60">
                            {t.dashboard.auditLogs.list.loading}
                        </div>
                    ) : logs.length === 0 ? (
                        <DashboardEmptyState title={t.dashboard.auditLogs.list.emptyTitle} description={t.dashboard.auditLogs.list.emptyDescription} />
                    ) : (
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div key={log.id} className="rounded-box border border-base-300 bg-base-200/40 p-4 transition-all hover:border-primary/20 hover:bg-base-100">
                                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${getActionBadgeColor(log.action)}`}>
                                                    {actionLabels[log.action] ?? log.action}
                                                </span>
                                                <span
                                                    className="rounded-full bg-base-100 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-base-content/50"
                                                    title={log.userId || t.dashboard.auditLogs.labels.system}
                                                >
                                                    {!log.userId || log.userId === "0" ? t.dashboard.auditLogs.labels.system : log.userId.slice(-8)}
                                                </span>
                                                <span className="text-xs text-base-content/45">{formatLogDate(log.createdAt)}</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-base-content">
                                                    {log.user?.username || log.user?.fullName || t.dashboard.auditLogs.labels.systemEvent}
                                                </div>
                                                <div className="text-xs text-base-content/45 break-words">{log.user?.email || log.ipAddress}</div>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 text-sm text-base-content/60 sm:grid-cols-2 xl:min-w-[420px]">
                                            <div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">
                                                    {t.dashboard.auditLogs.labels.request}
                                                </div>
                                                <div className="mt-2 break-all font-mono text-xs text-base-content/60">
                                                    {[log.requestMethod, log.requestPath, log.responseStatus].filter(Boolean).join(" - ") || "-"}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">
                                                    {t.dashboard.auditLogs.labels.target}
                                                </div>
                                                <div className="mt-2 break-words text-xs text-base-content/60">
                                                    {log.targetType || t.dashboard.auditLogs.labels.none}
                                                </div>
                                                {log.reason ? (
                                                    <div className="mt-1 text-xs text-error">
                                                        {t.dashboard.auditLogs.labels.reason}: {log.reason}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 rounded-box border border-dashed border-base-300 bg-base-100 px-4 py-3 text-sm leading-6 text-base-content/65 break-words">
                                        {formatDetails(log.details)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && logs.length > 0 ? (
                        <div className="mt-5">
                            <Pagination page={page} totalPages={totalPages} total={total} perPage={limitValue} onPage={setPage} />
                        </div>
                    ) : null}
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}

