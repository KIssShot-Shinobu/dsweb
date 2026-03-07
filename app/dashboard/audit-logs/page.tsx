"use client";

import { useEffect, useMemo, useState } from "react";
import { FormSelect } from "@/components/dashboard/form-select";
import { Pagination } from "@/components/dashboard/pagination";
import { btnOutline, btnPrimary, filterBarCls, searchInputCls } from "@/components/dashboard/form-styles";
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
    { value: "SENSITIVE_FIELD_CHANGED", label: "Perubahan Data Sensitif" },
    { value: "TOURNAMENT_REGISTERED", label: "Daftar Turnamen" },
    { value: "ROLE_CHANGED", label: "Perubahan Role" },
    { value: "TREASURY_ADDED", label: "Treasury Ditambah" },
    { value: "TREASURY_UPDATED", label: "Treasury Diubah" },
    { value: "TREASURY_DELETED", label: "Treasury Dihapus" },
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

const getActionBadgeColor = (action: string) => {
    if (action.includes("SUCCESS") || action.includes("APPROVED") || action.includes("REGISTERED")) {
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    }
    if (action.includes("FAILED") || action.includes("BANNED")) {
        return "bg-red-500/10 text-red-500 border-red-500/20";
    }
    if (action.includes("UPDATED") || action.includes("CHANGED")) {
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
    return "bg-ds-amber/10 text-ds-amber border-ds-amber/20";
};

export default function AuditLogsPage() {
    const [page, setPage] = useState(1);
    const limit = 20;
    const [actionFilter, setActionFilter] = useState("ALL");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");
    const [appliedDateRange, setAppliedDateRange] = useState({ start: "", end: "" });
    const [exportMessage, setExportMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

    const { logs, total, loading } = useAuditLogs(page, limit, actionFilter, search, appliedDateRange);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const summary = useMemo(
        () => ({
            failed: logs.filter((log) => log.action.includes("FAILED") || log.action.includes("BANNED")).length,
            sensitive: logs.filter((log) => log.action === "SENSITIVE_FIELD_CHANGED").length,
            auth: logs.filter((log) => log.action.startsWith("LOGIN") || log.action.startsWith("PASSWORD_")).length,
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
            <div className="space-y-5 lg:space-y-6">
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
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${exportMessage.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" : "border-red-500/20 bg-red-500/10 text-red-500"}`}>
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
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[220px_minmax(0,1fr)_170px_170px_auto]">
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
                            <button onClick={applyFilters} className={btnPrimary}>
                                Terapkan
                            </button>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title="Daftar Audit Logs" description={`Menampilkan ${total} log yang sesuai dengan filter sekarang.`}>
                    {loading ? (
                        <div className="rounded-2xl border border-black/5 bg-slate-50/80 px-5 py-12 text-center text-sm text-slate-500 dark:border-white/6 dark:bg-white/[0.03] dark:text-white/45">
                            Memuat data log...
                        </div>
                    ) : logs.length === 0 ? (
                        <DashboardEmptyState title="Tidak ada log ditemukan" description="Coba ubah filter action, kata kunci pencarian, atau rentang tanggal." />
                    ) : (
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div key={log.id} className="rounded-2xl border border-black/5 bg-slate-50/80 p-4 transition-all hover:bg-white dark:border-white/6 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]">
                                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${getActionBadgeColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:bg-white/5 dark:text-white/40" title={log.userId}>
                                                    {log.userId === "0" ? "SYSTEM" : log.userId.slice(-8)}
                                                </span>
                                                <span className="text-xs text-slate-400 dark:text-white/35">{formatDate(log.createdAt)}</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-950 dark:text-white">{log.user?.fullName || "System Event"}</div>
                                                <div className="text-xs text-slate-400 dark:text-white/35">{log.user?.email || log.ipAddress}</div>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 text-sm text-slate-500 dark:text-white/45 sm:grid-cols-2 xl:min-w-[420px]">
                                            <div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">Request</div>
                                                <div className="mt-2 font-mono text-xs text-slate-500 dark:text-white/45">
                                                    {[log.requestMethod, log.requestPath, log.responseStatus].filter(Boolean).join(" - ") || "-"}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">Target</div>
                                                <div className="mt-2 text-xs text-slate-500 dark:text-white/45">{log.targetType || "NONE"}</div>
                                                {log.reason ? <div className="mt-1 text-xs text-red-500">Reason: {log.reason}</div> : null}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 rounded-2xl border border-dashed border-black/5 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-white/8 dark:bg-black/10 dark:text-white/60">
                                        {formatDetails(log.details)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && logs.length > 0 ? (
                        <div className="mt-5">
                            <Pagination page={page} totalPages={totalPages} total={total} perPage={limit} onPage={setPage} />
                        </div>
                    ) : null}
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
