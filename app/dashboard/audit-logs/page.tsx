"use client";

import { useEffect, useMemo, useState } from "react";
import { FormSelect } from "@/components/dashboard/form-select";
import { Pagination } from "@/components/dashboard/pagination";

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
    { value: "USER_REJECTED", label: "User Ditolak" },
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
    if (action.includes("FAILED") || action.includes("REJECTED") || action.includes("BANNED")) {
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

    const { logs, total, loading } = useAuditLogs(page, limit, actionFilter, search, appliedDateRange);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const summary = useMemo(() => ({
        failed: logs.filter((log) => log.action.includes("FAILED") || log.action.includes("REJECTED") || log.action.includes("BANNED")).length,
        sensitive: logs.filter((log) => log.action === "SENSITIVE_FIELD_CHANGED").length,
        auth: logs.filter((log) => log.action.startsWith("LOGIN") || log.action.startsWith("PASSWORD_")).length,
    }), [logs]);

    const applyFilters = () => {
        setPage(1);
        setSearch(searchInput);
        setAppliedDateRange({ start: dateStart, end: dateEnd });
    };

    const handleExportCsv = async () => {
        const params = new URLSearchParams();
        if (actionFilter !== "ALL") params.set("action", actionFilter);
        if (search.trim()) params.set("search", search.trim());
        if (appliedDateRange.start) params.set("startDate", appliedDateRange.start);
        if (appliedDateRange.end) params.set("endDate", appliedDateRange.end);

        try {
            const res = await fetch(`/api/audit-logs/export?${params.toString()}`);
            if (!res.ok) {
                const json = await res.json();
                window.alert(json.message || "Failed to export CSV");
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
        } catch {
            window.alert("Terjadi kesalahan saat mengekspor data");
        }
    };

    return (
        <div className="min-h-screen flex-1 overflow-x-hidden bg-gray-50 p-6 pb-24 text-gray-900 dark:bg-[#0f0f0f] dark:text-white lg:p-10">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Audit Logs</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-neutral-400">
                            Pantau aktivitas auth, perubahan data sensitif, tournament, treasury, dan operasi admin lain dalam satu tempat.
                        </p>
                    </div>

                    <button
                        onClick={handleExportCsv}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium tracking-wide text-gray-900 transition-all hover:bg-gray-100 hover:border-gray-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
                    >
                        <span>Download</span> Export CSV
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/5 dark:bg-[#111]">
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">Log Halaman Ini</div>
                        <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{logs.length}</div>
                    </div>
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-red-400/80">Aksi Gagal / Risiko</div>
                        <div className="mt-2 text-2xl font-bold text-red-400">{summary.failed}</div>
                    </div>
                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-blue-400/80">Auth + Sensitive</div>
                        <div className="mt-2 text-2xl font-bold text-blue-400">{summary.auth + summary.sensitive}</div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/5 dark:bg-[#111]">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr_170px_170px_auto]">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 dark:text-neutral-400">Jenis Aksi</label>
                            <FormSelect value={actionFilter} onChange={(value) => { setActionFilter(value); setPage(1); }} options={ACTION_OPTIONS} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 dark:text-neutral-400">Cari User/Aksi/Target</label>
                            <input
                                type="text"
                                placeholder="Contoh: LOGIN, tournament, userId..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-ds-amber focus:outline-none dark:border-white/10 dark:bg-[#161616] dark:text-white"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 dark:text-neutral-400">Tgl Mulai</label>
                            <input
                                type="date"
                                value={dateStart}
                                onChange={(e) => setDateStart(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-ds-amber focus:outline-none dark:border-white/10 dark:bg-[#161616] dark:text-white"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 dark:text-neutral-400">Tgl Akhir</label>
                            <input
                                type="date"
                                value={dateEnd}
                                onChange={(e) => setDateEnd(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-ds-amber focus:outline-none dark:border-white/10 dark:bg-[#161616] dark:text-white"
                            />
                        </div>

                        <div className="flex items-end">
                            <button onClick={applyFilters} className="w-full rounded-lg bg-ds-amber px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-yellow-500 md:w-auto">
                                Terapkan
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#111] dark:shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left text-sm">
                            <thead className="border-b border-gray-200 bg-gray-100 text-xs uppercase tracking-wider text-gray-600 dark:border-white/5 dark:bg-[#161616] dark:text-neutral-400">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Waktu</th>
                                    <th className="px-6 py-4 font-semibold">Actor</th>
                                    <th className="px-6 py-4 font-semibold">Aksi</th>
                                    <th className="px-6 py-4 font-semibold hidden md:table-cell">Request</th>
                                    <th className="px-6 py-4 font-semibold">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-neutral-500">
                                            Memuat data log...
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-neutral-500">
                                            Tidak ada log yang ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                                            <td className="px-6 py-4 text-gray-700 dark:text-neutral-300">{formatDate(log.createdAt)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="w-fit rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500 dark:bg-white/5 dark:text-neutral-400" title={log.userId}>
                                                        {log.userId === "0" ? "SYSTEM" : log.userId.slice(-8)}
                                                    </span>
                                                    {log.user && (
                                                        <span className="max-w-[180px] truncate text-xs text-gray-500 dark:text-neutral-500" title={log.user.email}>
                                                            {log.user.fullName}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getActionBadgeColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="hidden px-6 py-4 md:table-cell">
                                                <div className="space-y-1 text-xs text-gray-500 dark:text-neutral-400">
                                                    <div>{log.ipAddress}</div>
                                                    <div className="font-mono">
                                                        {[log.requestMethod, log.requestPath, log.responseStatus].filter(Boolean).join(" · ") || "-"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-[260px] truncate text-gray-700 dark:text-neutral-300 md:max-w-md lg:max-w-lg" title={formatDetails(log.details)}>
                                                    <div className="mb-1 flex gap-2">
                                                        <span className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px] uppercase tracking-wide opacity-70 dark:bg-black/30">
                                                            {log.targetType || "NONE"}
                                                        </span>
                                                        {log.reason && (
                                                            <span className="rounded bg-red-500/10 px-1 py-0.5 font-mono text-[10px] uppercase tracking-wide text-red-500 dark:text-red-400" title={log.reason}>
                                                                REASON
                                                            </span>
                                                        )}
                                                    </div>
                                                    {formatDetails(log.details)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {!loading && logs.length > 0 && (
                    <Pagination page={page} totalPages={totalPages} total={total} perPage={limit} onPage={setPage} />
                )}
            </div>
        </div>
    );
}
