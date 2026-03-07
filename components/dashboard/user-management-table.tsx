"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormSelect } from "@/components/dashboard/form-select";
import { Pagination } from "@/components/dashboard/pagination";

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
    PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
    BANNED: "bg-red-900/20 text-red-500 border-red-900/20",
};

const ROLE_COLORS: Record<string, string> = {
    USER: "text-gray-400",
    MEMBER: "text-blue-400",
    OFFICER: "text-purple-400",
    ADMIN: "text-ds-amber",
    FOUNDER: "text-red-400",
};

const ROLE_OPTIONS = ["USER", "MEMBER", "OFFICER", "ADMIN"];
const STATUS_OPTIONS = ["ALL", "ACTIVE", "PENDING", "REJECTED", "BANNED"];
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
        await fetch(`/api/admin/users/${userId}/status`, {
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
                className={`flex items-center gap-1 rounded-lg border border-current/20 px-2 py-1 text-[10px] font-bold uppercase transition-all hover:bg-white/5 disabled:opacity-50 ${ROLE_COLORS[currentRole] || "text-gray-400"}`}
            >
                {loading ? "..." : currentRole}
                <svg className={`h-3 w-3 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[110px] overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c] shadow-2xl">
                        {ROLE_OPTIONS.map((role) => (
                            <button
                                key={role}
                                onClick={() => changeRole(role)}
                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold uppercase transition-all ${role === currentRole ? `${ROLE_COLORS[role]} bg-white/5` : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                            >
                                {role === currentRole && <span className="text-[8px]">✓</span>}
                                {role}
                            </button>
                        ))}
                    </div>
                </>
            )}
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
        fetch(`/api/admin/users?${paramsString}`)
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
        await fetch(`/api/admin/users/${id}/status`, {
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
        name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2);

    return (
        <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">{title}</h1>
                    <p className="text-sm text-gray-400 dark:text-white/40">{description}</p>
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={(event) => setParam("search", event.target.value)}
                    placeholder="Cari nama/email..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-ds-amber dark:border-white/10 dark:bg-white/5 dark:text-white/70 sm:w-56"
                />
            </div>

            {(!lockStatus || !lockRole) && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    {!lockStatus && (
                        <FormSelect
                            value={statusFilter}
                            onChange={(value) => setParam("status", value)}
                            options={STATUS_FILTER_OPTIONS}
                            className="w-full sm:w-[180px]"
                        />
                    )}

                    {!lockRole && (
                        <FormSelect
                            value={roleFilter}
                            onChange={(value) => setParam("role", value)}
                            options={ROLE_FILTER_OPTIONS}
                            className="w-full sm:w-[180px]"
                        />
                    )}
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1a1a1a]">
                {loading ? (
                    <div className="space-y-2 p-4">
                        {[1, 2, 3, 4, 5].map((item) => (
                            <div key={item} className="h-16 rounded-xl bg-gray-100 animate-pulse dark:bg-white/5" />
                        ))}
                    </div>
                ) : users.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="mb-3 text-4xl">👤</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{emptyTitle}</div>
                        <div className="text-sm text-gray-500 dark:text-white/40">{emptyDescription}</div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ds-amber text-xs font-bold text-black">
                                    {getInitials(user.fullName)}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user.fullName}</div>
                                    <div className="truncate text-xs text-gray-400 dark:text-white/40">
                                        {user.email} · {user.city || "-"}
                                    </div>
                                    {user.gameProfiles.length > 0 && (
                                        <div className="mt-0.5 flex flex-wrap gap-1">
                                            {user.gameProfiles.map((profile) => (
                                                <span key={`${user.id}-${profile.gameType}`} className="rounded bg-ds-amber/10 px-1.5 py-0.5 font-mono text-[10px] text-ds-amber">
                                                    {profile.ign}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="hidden min-w-[96px] flex-col items-end gap-1 md:flex">
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[user.status] || ""}`}>
                                        {user.status}
                                    </span>
                                    <span className="text-[10px] text-gray-400 dark:text-white/30">
                                        {new Date(user.createdAt).toLocaleDateString("id-ID")}
                                    </span>
                                </div>

                                <RoleDropdown
                                    userId={user.id}
                                    currentRole={user.role}
                                    currentStatus={user.status}
                                    onChanged={fetchUsers}
                                />

                                {user.status === "ACTIVE" && user.role !== "FOUNDER" && (
                                    <button
                                        onClick={() => setBanModal({ id: user.id, name: user.fullName })}
                                        disabled={actionLoading === user.id}
                                        className="flex-shrink-0 rounded-lg border border-red-500/10 bg-red-500/5 px-2 py-1.5 text-xs text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
                                        title="Ban user"
                                    >
                                        🚫
                                    </button>
                                )}

                                {user.status === "BANNED" && (
                                    <button
                                        onClick={async () => {
                                            setActionLoading(user.id);
                                            await fetch(`/api/admin/users/${user.id}/status`, {
                                                method: "PUT",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ status: "ACTIVE" }),
                                            });
                                            setActionLoading(null);
                                            fetchUsers();
                                        }}
                                        disabled={actionLoading === user.id}
                                        className="flex-shrink-0 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-2 py-1.5 text-xs text-emerald-400 transition-all hover:bg-emerald-500/10 disabled:opacity-50"
                                        title="Unban user"
                                    >
                                        ✅
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPage={(nextPage) => setParam("page", String(nextPage))} />

            {banModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBanModal(null)} />
                    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white p-6 shadow-2xl dark:bg-[#1a1a1a]">
                        <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-white">Ban Pengguna</h3>
                        <p className="mb-4 text-sm text-gray-500 dark:text-white/40">
                            Untuk: <strong className="text-gray-900 dark:text-white">{banModal.name}</strong>
                        </p>
                        <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="Alasan ban (opsional)..."
                            rows={3}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-ds-amber dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => setBanModal(null)} className="flex-1 rounded-xl border border-gray-200 py-2 text-sm text-gray-500 dark:border-white/10 dark:text-white/50">
                                Batal
                            </button>
                            <button onClick={() => handleBan(banModal.id, reason)} className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white transition-all hover:bg-red-600">
                                Ban User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export function UserManagementTable(props: UserManagementTableProps) {
    return (
        <Suspense>
            <UserManagementTableInner {...props} />
        </Suspense>
    );
}
