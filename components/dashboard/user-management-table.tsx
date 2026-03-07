"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormSelect } from "@/components/dashboard/form-select";
import { Pagination } from "@/components/dashboard/pagination";
import {
    btnDanger,
    btnOutline,
    filterBarCls,
    inputCls,
    searchInputCls,
} from "@/components/dashboard/form-styles";
import {
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";

interface UserRow {
    id: string;
    fullName: string;
    email: string;
    phoneWhatsapp: string | null;
    city: string | null;
    status: string;
    role: string;
    createdAt: string;
    gameProfiles: { gameType: string; ign: string; gameId: string }[];
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
const STATUS_OPTIONS = ["ALL", "ACTIVE", "BANNED"];
const FILTER_ROLE_OPTIONS = ["ALL", "USER", "MEMBER", "OFFICER", "ADMIN", "FOUNDER"];
const STATUS_FILTER_OPTIONS = STATUS_OPTIONS.map((status) => ({
    value: status,
    label: status === "ALL" ? "Semua Status" : status,
}));
const ROLE_FILTER_OPTIONS = FILTER_ROLE_OPTIONS.map((role) => ({
    value: role,
    label: role === "ALL" ? "Semua Role" : role,
}));

function RoleDropdown({
    userId,
    currentRole,
    currentStatus,
    onChanged,
}: {
    userId: string;
    currentRole: string;
    currentStatus: string;
    onChanged: () => void;
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
        await fetch(`/api/users/${userId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: currentStatus, role: newRole }),
        });
        setLoading(false);
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
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);

    const [users, setUsers] = useState<UserRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [banModal, setBanModal] = useState<{ id: string; name: string } | null>(null);
    const [reason, setReason] = useState("");

    const perPage = 15;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const paramsString = useMemo(() => {
        const params = new URLSearchParams({
            status: statusFilter,
            role: roleFilter,
            search,
            page: String(page),
            perPage: String(perPage),
        });
        return params.toString();
    }, [page, perPage, roleFilter, search, statusFilter]);

    const fetchUsers = () => {
        setLoading(true);
        fetch(`/api/users?${paramsString}`)
            .then((response) => response.json())
            .then((data) => {
                setUsers(data.data || []);
                setTotal(data.total || 0);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, [paramsString]);

    const setParam = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);
        if (key !== "page") params.set("page", "1");
        if (lockStatus) params.set("status", defaultStatus);
        if (lockRole) params.set("role", defaultRole);
        router.push(`?${params.toString()}`);
    };

    const handleBan = async (id: string, banReason?: string) => {
        setActionLoading(id);
        await fetch(`/api/users/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "BANNED", reason: banReason }),
        });
        setActionLoading(null);
        setBanModal(null);
        setReason("");
        fetchUsers();
    };

    const getInitials = (name: string) =>
        name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

    const bannedCount = users.filter((user) => user.status === "BANNED").length;
    const visibleActiveCount = users.filter((user) => user.status === "ACTIVE").length;

    return (
        <DashboardPageShell>
            <div className="space-y-5 lg:space-y-6">
                <DashboardPageHeader
                    kicker="User Control"
                    title={title}
                    description={description}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <DashboardMetricCard label="Visible Results" value={loading ? "..." : users.length} meta="Jumlah user pada halaman ini" tone="accent" />
                    <DashboardMetricCard label="Active on View" value={loading ? "..." : visibleActiveCount} meta="Akun aktif dalam hasil filter sekarang" tone="success" />
                    <DashboardMetricCard label="Banned on View" value={loading ? "..." : bannedCount} meta="Akun diblokir pada hasil filter sekarang" tone="danger" />
                </div>

                <DashboardPanel title="Filter & Search" description="Cari user berdasarkan nama atau email, lalu sempitkan dengan status dan role.">
                    <div className={filterBarCls}>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setParam("search", event.target.value)}
                                placeholder="Cari nama atau email user..."
                                className={searchInputCls}
                            />
                            {!lockStatus ? (
                                <FormSelect
                                    value={statusFilter}
                                    onChange={(value) => setParam("status", value)}
                                    options={STATUS_FILTER_OPTIONS}
                                    className="w-full"
                                />
                            ) : null}
                            {!lockRole ? (
                                <FormSelect
                                    value={roleFilter}
                                    onChange={(value) => setParam("role", value)}
                                    options={ROLE_FILTER_OPTIONS}
                                    className="w-full"
                                />
                            ) : null}
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title="Daftar Users" description={`Menampilkan ${total} user yang sesuai dengan filter saat ini.`}>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="h-20 animate-pulse rounded-2xl border border-black/5 bg-slate-100/90 dark:border-white/6 dark:bg-white/[0.04]" />
                            ))}
                        </div>
                    ) : users.length === 0 ? (
                        <DashboardEmptyState title={emptyTitle} description={emptyDescription} />
                    ) : (
                        <div className="space-y-3">
                            {users.map((user) => (
                                <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-slate-50/80 p-4 transition-all hover:bg-white dark:border-white/6 dark:bg-white/[0.03] dark:hover:bg-white/[0.05] lg:flex-row lg:items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-ds-amber text-sm font-bold text-black">
                                            {getInitials(user.fullName)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{user.fullName}</div>
                                            <div className="truncate text-xs text-slate-400 dark:text-white/40">
                                                {user.email} - {user.city || "Kota belum diisi"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_140px_120px_140px] lg:items-center">
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
                                        <div className="flex items-center gap-2">
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${STATUS_COLORS[user.status] || ""}`}>
                                                {user.status}
                                            </span>
                                            <span className="text-xs text-slate-400 dark:text-white/35">
                                                {new Date(user.createdAt).toLocaleDateString("id-ID")}
                                            </span>
                                        </div>
                                        <RoleDropdown userId={user.id} currentRole={user.role} currentStatus={user.status} onChanged={fetchUsers} />
                                        <div className="flex justify-start gap-2 lg:justify-end">
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
                                                    onClick={async () => {
                                                        setActionLoading(user.id);
                                                        await fetch(`/api/users/${user.id}/status`, {
                                                            method: "PUT",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ status: "ACTIVE" }),
                                                        });
                                                        setActionLoading(null);
                                                        fetchUsers();
                                                    }}
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
