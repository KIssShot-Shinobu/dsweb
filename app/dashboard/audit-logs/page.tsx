"use client";

import { useState, useEffect } from "react";

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
    };
};

function useAuditLogs(
    page: number,
    limit: number,
    actionFilter: string,
    userFilter: string,
    dateRange: { start: string, end: string }
) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: page.toString(),
                    limit: limit.toString(),
                });

                if (actionFilter && actionFilter !== "ALL") params.append("action", actionFilter);
                if (userFilter) params.append("userId", userFilter);
                if (dateRange.start) params.append("startDate", dateRange.start);
                if (dateRange.end) params.append("endDate", dateRange.end);

                const res = await fetch(`/api/audit-logs?${params.toString()}`);
                const json = await res.json();

                if (json.success) {
                    setLogs(json.data);
                    setTotal(json.total);
                } else {
                    console.error("Failed to fetch logs:", json.message);
                }
            } catch (err) {
                console.error("Error fetching logs:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [page, limit, actionFilter, userFilter, dateRange]);

    return { logs, total, loading };
}

const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(dateString));
};

export default function AuditLogsPage() {
    const [page, setPage] = useState(1);
    const limit = 20;

    const [actionFilter, setActionFilter] = useState("ALL");
    const [userFilterInput, setUserFilterInput] = useState("");
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");

    const [appliedUserFilter, setAppliedUserFilter] = useState("");
    const [appliedDateRange, setAppliedDateRange] = useState({ start: "", end: "" });

    const { logs, total, loading } = useAuditLogs(
        page,
        limit,
        actionFilter,
        appliedUserFilter,
        appliedDateRange
    );

    const totalPages = Math.ceil(total / limit) || 1;

    const applyFilters = () => {
        setPage(1);
        setAppliedUserFilter(userFilterInput);
        setAppliedDateRange({ start: dateStart, end: dateEnd });
    };

    const handleExportCsv = async () => {
        try {
            const res = await fetch('/api/audit-logs/export');
            if (!res.ok) {
                const json = await res.json();
                alert(json.message || "Failed to export CSV");
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "audit_logs.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error:", err);
            alert("Terjadi kesalahan saat mengekspor data");
        }
    };

    const getActionBadgeColor = (action: string) => {
        if (action.includes("SUCCESS") || action.includes("APPROVED")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        if (action.includes("FAILED") || action.includes("REJECTED") || action.includes("BANNED")) return "bg-red-500/10 text-red-500 border-red-500/20";
        if (action.includes("UPDATED") || action.includes("CHANGED")) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
        return "bg-ds-amber/10 text-ds-amber border-ds-amber/20";
    };

    const formatDetails = (detailsStr: string | null) => {
        if (!detailsStr) return "-";
        try {
            const obj = JSON.parse(detailsStr);
            return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(", ");
        } catch {
            return detailsStr;
        }
    };

    return (
        <div className="flex-1 overflow-x-hidden min-h-screen p-6 lg:p-10 pb-24 bg-gray-50 dark:bg-[#0f0f0f] text-gray-900 dark:text-white">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Audit Logs</h1>
                        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 max-w-2xl">
                            Pantau semua aktivitas keamanan dan data yang terjadi di dalam admin dashboard dan sistem registrasi.
                        </p>
                    </div>

                    <button
                        onClick={handleExportCsv}
                        className="px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg font-medium tracking-wide border border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 transition-all text-sm flex items-center gap-2"
                    >
                        <span>Download</span> Export CSV
                    </button>
                </div>

                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium">Jenis Aksi</label>
                        <select
                            value={actionFilter}
                            onChange={(e) => {
                                setActionFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ds-amber"
                        >
                            <option value="ALL">Semua Aksi</option>
                            <option value="LOGIN_SUCCESS">Login Berhasil</option>
                            <option value="LOGIN_FAILED">Login Gagal</option>
                            <option value="LOGOUT">Logout</option>
                            <option value="USER_REGISTERED">User Baru (Registrasi)</option>
                            <option value="MEMBER_APPROVED">Member Approved</option>
                            <option value="MEMBER_REJECTED">Member Rejected</option>
                            <option value="MEMBER_BANNED">Member Banned</option>
                            <option value="ROLE_CHANGED">Update Role</option>
                        </select>
                    </div>

                    <div className="flex-1 space-y-1">
                        <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium">Filter User ID</label>
                        <input
                            type="text"
                            placeholder="Cari User ID..."
                            value={userFilterInput}
                            onChange={(e) => setUserFilterInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                            className="w-full bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ds-amber"
                        />
                    </div>

                    <div className="flex-1 space-y-1">
                        <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium">Tgl Mulai</label>
                        <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ds-amber transition-colors"
                        />
                    </div>

                    <div className="flex-1 space-y-1">
                        <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium">Tgl Akhir</label>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ds-amber transition-colors"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={applyFilters}
                            className="w-full md:w-auto px-5 py-2 bg-ds-amber hover:bg-yellow-500 text-black font-semibold rounded-lg text-sm transition-all"
                        >
                            Terapkan
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-100 dark:bg-[#161616] text-gray-600 dark:text-neutral-400 border-b border-gray-200 dark:border-white/5 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Waktu</th>
                                    <th className="px-6 py-4 font-semibold">User ID</th>
                                    <th className="px-6 py-4 font-semibold">Aksi</th>
                                    <th className="px-6 py-4 font-semibold hidden md:table-cell">Target IP</th>
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
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-gray-700 dark:text-neutral-300">
                                                {formatDate(log.createdAt)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-mono text-xs px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded-md text-gray-500 dark:text-neutral-400 w-fit" title={log.userId}>
                                                        {log.userId === "0" ? "SYSTEM" : log.userId.slice(-6)}
                                                    </span>
                                                    {log.user && (
                                                        <span className="text-xs text-gray-500 dark:text-neutral-500 truncate max-w-[150px]" title={log.user.email}>
                                                            {log.user.fullName}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getActionBadgeColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell text-gray-500 dark:text-neutral-400 font-mono text-xs">
                                                {log.ipAddress}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-700 dark:text-neutral-300 truncate max-w-[250px] md:max-w-md lg:max-w-lg" title={formatDetails(log.details)}>
                                                    <div className="mb-1 flex gap-2">
                                                        <span className="opacity-70 font-mono text-[10px] bg-gray-100 dark:bg-black/30 px-1 py-0.5 rounded uppercase tracking-wide">
                                                            {log.targetType || "NONE"}
                                                        </span>
                                                        {log.reason && (
                                                            <span className="opacity-70 font-mono text-[10px] bg-red-500/10 text-red-500 dark:text-red-400 px-1 py-0.5 rounded uppercase tracking-wide" title={log.reason}>
                                                                REASON: {log.reason}
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
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/5 pt-4">
                        <div className="text-sm text-gray-500 dark:text-neutral-400">
                            Menampilkan <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * limit + 1}</span> hingga <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * limit, total)}</span> dari <span className="font-medium text-gray-900 dark:text-white">{total}</span> total logs
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm transition-all"
                            >
                                Sebelum
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm transition-all"
                            >
                                Lanjut
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
