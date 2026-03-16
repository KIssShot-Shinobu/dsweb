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

type AuditLog = {
    id: string;
    userId: string;
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

const ACTION_OPTIONS = [
    { value: "ALL", label: "Semua Aksi" },
    { value: "LOGIN_SUCCESS", label: "Login Berhasil" },
    { value: "LOGIN_FAILED", label: "Login Gagal" },
    { value: "USER_REGISTERED", label: "Registrasi User" },
    { value: "USER_APPROVED", label: "User Disetujui" },
    { value: "USER_BANNED", label: "User Diblokir" },
    { value: "PASSWORD_RESET_SUCCESS", label: "Password Diubah/Reset" },
    { value: "OAUTH_GOOGLE_LOGIN_SUCCESS", label: "Google Login" },
    { value: "OAUTH_GOOGLE_ACCOUNT_LINKED", label: "Google Ditautkan" },
    { value: "OAUTH_GOOGLE_ACCOUNT_CREATED", label: "User Baru dari Google" },
    { value: "OAUTH_DISCORD_LOGIN_SUCCESS", label: "Discord Login" },
    { value: "OAUTH_DISCORD_ACCOUNT_LINKED", label: "Discord Ditautkan" },
    { value: "OAUTH_DISCORD_ACCOUNT_CREATED", label: "User Baru dari Discord" },
    { value: "SENSITIVE_FIELD_CHANGED", label: "Perubahan Data Sensitif" },
    { value: "TOURNAMENT_REGISTERED", label: "Daftar Turnamen" },
    { value: "TOURNAMENT_STARTED", label: "Turnamen Dimulai" },
    { value: "TOURNAMENT_CHECKIN_UPDATED", label: "Check-in Turnamen" },
    { value: "TOURNAMENT_PARTICIPANT_UPDATED", label: "Update Peserta Turnamen" },
    { value: "TOURNAMENT_PARTICIPANT_REMOVED", label: "Hapus Peserta Turnamen" },
    { value: "TOURNAMENT_PARTICIPANT_CHECKIN_TOGGLED", label: "Check-in Peserta" },
    { value: "TOURNAMENT_ANNOUNCEMENT_CREATED", label: "Pengumuman Turnamen Dibuat" },
    { value: "TOURNAMENT_ANNOUNCEMENT_UPDATED", label: "Pengumuman Turnamen Diubah" },
    { value: "TOURNAMENT_ANNOUNCEMENT_DELETED", label: "Pengumuman Turnamen Dihapus" },
    { value: "MATCH_REPORTED", label: "Laporan Match" },
    { value: "MATCH_CONFIRMED", label: "Match Dikonfirmasi" },
    { value: "MATCH_ADMIN_RESOLVED", label: "Match Diresolve Admin" },
    { value: "RATE_LIMIT_HIT", label: "Rate Limit" },
    { value: "ROLE_CHANGED", label: "Perubahan Role" },
    { value: "TREASURY_ADDED", label: "Treasury Ditambah" },
    { value: "TREASURY_UPDATED", label: "Treasury Diubah" },
    { value: "TREASURY_DELETED", label: "Treasury Dihapus" },
];

const PAGE_SIZE_OPTIONS = [
    { value: "10", label: "10 / halaman" },
    { value: "20", label: "20 / halaman" },
    { value: "50", label: "50 / halaman" },
];

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

const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(dateString));

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

const ACTION_LABELS: Record<string, string> = Object.fromEntries(
    ACTION_OPTIONS.filter((item) => item.value !== "ALL").map((item) => [item.value, item.label])
);

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
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState("20");
    const [actionFilter, setActionFilter] = useState("ALL");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");
    const [appliedDateRange, setAppliedDateRange] = useState({ start: "", end: "" });
    const [exportMessage, setExportMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

    const limitValue = Math.max(1, Number(limit) || 20);
    const { logs, total, loading } = useAuditLogs(page, limitValue, actionFilter, search, appliedDateRange);
    const totalPages = Math.max(1, Math.ceil(total / limitValue));

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
                    text: json?.message || "Gagal mengekspor CSV",
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
                text: "Export CSV berhasil dibuat.",
            });
        } catch {
            setExportMessage({
                type: "error",
                text: "Terjadi kesalahan saat mengekspor data.",
            });
        }
    };

    return (
        <DashboardPageShell>
            <div className={dashboardStackCls}>
                <DashboardPageHeader
                    kicker="Audit Trail"
                    title="Audit Logs"
                    description="Pantau aktivitas auth, perubahan data sensitif, tournament, treasury, dan operasi operator dari satu halaman yang lebih mudah dipindai."
                    actions={
                        <button onClick={handleExportCsv} className={btnOutline}>
                            Export CSV
                        </button>
                    }
                />

                {exportMessage ? (
                    <div className={`rounded-box border px-4 py-3 text-sm ${exportMessage.type === "success" ? "border-success/20 bg-success/10 text-success" : "border-error/20 bg-error/10 text-error"}`}>
                        {exportMessage.text}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <DashboardMetricCard label="Log Halaman Ini" value={loading ? "..." : logs.length} meta="Jumlah log pada halaman aktif" tone="accent" />
                    <DashboardMetricCard label="Aksi Gagal / Risiko" value={loading ? "..." : summary.failed} meta="Gagal login atau user diblokir" tone="danger" />
                    <DashboardMetricCard label="Auth + Sensitive" value={loading ? "..." : summary.auth + summary.sensitive} meta="Aktivitas auth dan perubahan sensitif" tone="success" />
                </div>

                <DashboardPanel title="Filter Audit" description="Cari user, target, atau rentang tanggal agar investigasi lebih cepat.">
                    <div className={filterBarCls}>
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[220px_minmax(0,1fr)_160px_160px_150px_auto]">
                            <FormSelect value={actionFilter} onChange={(value) => { setActionFilter(value); setPage(1); }} options={ACTION_OPTIONS} />
                            <input
                                type="text"
                                placeholder="Cari user, target, atau action..."
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
                                options={PAGE_SIZE_OPTIONS}
                            />
                            <button onClick={applyFilters} className={btnPrimary}>
                                Terapkan
                            </button>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title="Daftar Audit Logs" description={`Menampilkan ${total} log yang sesuai dengan filter sekarang.`}>
                    {loading ? (
                        <div className="rounded-box border border-base-300 bg-base-200/40 px-5 py-12 text-center text-sm text-base-content/60">
                            Memuat data log...
                        </div>
                    ) : logs.length === 0 ? (
                        <DashboardEmptyState title="Tidak ada log ditemukan" description="Coba ubah filter action, kata kunci pencarian, atau rentang tanggal." />
                    ) : (
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div key={log.id} className="rounded-box border border-base-300 bg-base-200/40 p-4 transition-all hover:border-primary/20 hover:bg-base-100">
                                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${getActionBadgeColor(log.action)}`}>
                                                    {ACTION_LABELS[log.action] ?? log.action}
                                                </span>
                                                <span className="rounded-full bg-base-100 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-base-content/50" title={log.userId}>
                                                    {log.userId === "0" ? "SYSTEM" : log.userId.slice(-8)}
                                                </span>
                                                <span className="text-xs text-base-content/45">{formatDate(log.createdAt)}</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-base-content">{log.user?.fullName || "System Event"}</div>
                                                <div className="text-xs text-base-content/45 break-words">{log.user?.email || log.ipAddress}</div>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 text-sm text-base-content/60 sm:grid-cols-2 xl:min-w-[420px]">
                                            <div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">Request</div>
                                                <div className="mt-2 break-all font-mono text-xs text-base-content/60">
                                                    {[log.requestMethod, log.requestPath, log.responseStatus].filter(Boolean).join(" - ") || "-"}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">Target</div>
                                                <div className="mt-2 break-words text-xs text-base-content/60">{log.targetType || "NONE"}</div>
                                                {log.reason ? <div className="mt-1 text-xs text-error">Reason: {log.reason}</div> : null}
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

