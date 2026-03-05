"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

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

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
    BANNED: "bg-red-900/20 text-red-500 border-red-900/20",
};
const ROLE_COLORS: Record<string, string> = {
    USER: "text-gray-400", MEMBER: "text-blue-400", OFFICER: "text-purple-400", ADMIN: "text-ds-amber", FOUNDER: "text-red-400",
};
const ROLES = ["USER", "MEMBER", "OFFICER", "ADMIN"];

function RoleDropdown({ userId, currentRole, onChanged }: { userId: string; currentRole: string; onChanged: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const changeRole = async (newRole: string) => {
        if (newRole === currentRole) { setOpen(false); return; }
        setLoading(true);
        setOpen(false);
        await fetch(`/api/admin/users/${userId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ACTIVE", role: newRole }),
        });
        setLoading(false);
        onChanged();
    };

    return (
        <div className="relative flex-shrink-0">
            <button
                onClick={() => setOpen((o) => !o)}
                disabled={loading}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase transition-all ${ROLE_COLORS[currentRole] || "text-gray-400"
                    } border-current/20 hover:bg-white/5 disabled:opacity-50`}
            >
                {loading ? "..." : currentRole}
                <svg className={`w-3 h-3 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-[#1c1c1c] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[110px]">
                        {ROLES.map((r) => (
                            <button
                                key={r}
                                onClick={() => changeRole(r)}
                                className={`w-full px-3 py-2 text-xs font-bold uppercase text-left transition-all flex items-center gap-2 ${r === currentRole
                                        ? `${ROLE_COLORS[r]} bg-white/5`
                                        : "text-white/50 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                {r === currentRole && <span className="text-[8px]">✓</span>}
                                {r}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function UserList() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const statusFilter = searchParams.get("status") || "ALL";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");

    const [users, setUsers] = useState<UserRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [banModal, setBanModal] = useState<{ id: string; name: string } | null>(null);
    const [reason, setReason] = useState("");

    const perPage = 15;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const fetchUsers = () => {
        setLoading(true);
        const params = new URLSearchParams({ status: statusFilter, search, page: String(page), perPage: String(perPage) });
        fetch(`/api/admin/users?${params}`)
            .then((r) => r.json())
            .then((d) => { setUsers(d.data || []); setTotal(d.total || 0); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchUsers(); }, [statusFilter, search, page]);

    const handleBan = async (id: string, r?: string) => {
        setActionLoading(id);
        await fetch(`/api/admin/users/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "BANNED", reason: r }),
        });
        setActionLoading(null);
        setBanModal(null);
        setReason("");
        fetchUsers();
    };

    const setParam = (key: string, value: string) => {
        const p = new URLSearchParams(searchParams.toString());
        p.set(key, value);
        if (key !== "page") p.set("page", "1");
        router.push(`?${p.toString()}`);
    };

    const filterBtn = (s: string) =>
        `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${statusFilter === s ? "bg-ds-amber text-black" : "text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5"}`;

    const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Manajemen Pengguna</h1>
                    <p className="text-sm text-gray-400 dark:text-white/40">Total {total} pengguna terdaftar</p>
                </div>
                <input
                    type="text"
                    placeholder="Cari nama/email..."
                    defaultValue={search}
                    onChange={(e) => setTimeout(() => setParam("search", e.target.value), 400)}
                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-white/70 placeholder:text-gray-400 outline-none focus:border-ds-amber w-full sm:w-52"
                />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1 mb-4 overflow-x-auto">
                {["ALL", "ACTIVE", "PENDING", "REJECTED", "BANNED"].map((s) => (
                    <button key={s} className={filterBtn(s)} onClick={() => setParam("status", s)}>{s}</button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
                {loading ? (
                    <div className="p-4 space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}</div>
                ) : users.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">👤</div>
                        <div className="text-sm text-gray-500 dark:text-white/40">Tidak ada pengguna ditemukan</div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-xl bg-ds-amber flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
                                    {getInitials(user.fullName)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.fullName}</div>
                                    <div className="text-xs text-gray-400 dark:text-white/40 truncate">{user.email} · {user.city || "?"}</div>
                                    {user.gameProfiles.length > 0 && (
                                        <div className="flex gap-1 mt-0.5 flex-wrap">
                                            {user.gameProfiles.map((gp) => (
                                                <span key={gp.gameType} className="text-[10px] text-ds-amber bg-ds-amber/10 px-1.5 py-0.5 rounded font-mono">{gp.ign}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="hidden md:flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLORS[user.status] || ""}`}>
                                        {user.status}
                                    </span>
                                    <span className="text-[10px] text-gray-400 dark:text-white/30">
                                        {new Date(user.createdAt).toLocaleDateString("id-ID")}
                                    </span>
                                </div>

                                {/* Role Dropdown — admin ubah role */}
                                <RoleDropdown userId={user.id} currentRole={user.role} onChanged={fetchUsers} />

                                {/* Ban button for ACTIVE users */}
                                {user.status === "ACTIVE" && user.role !== "FOUNDER" && (
                                    <button
                                        onClick={() => setBanModal({ id: user.id, name: user.fullName })}
                                        disabled={actionLoading === user.id}
                                        className="px-2 py-1.5 rounded-lg bg-red-500/5 text-red-400 border border-red-500/10 text-xs hover:bg-red-500/10 transition-all flex-shrink-0 disabled:opacity-50"
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
                                        className="px-2 py-1.5 rounded-lg bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 text-xs hover:bg-emerald-500/10 transition-all flex-shrink-0 disabled:opacity-50"
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button key={p} onClick={() => setParam("page", String(p))} className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${page === p ? "bg-ds-amber text-black" : "border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {/* Ban Confirmation Modal */}
            {banModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBanModal(null)} />
                    <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl border border-white/10 p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">🚫 Ban Pengguna</h3>
                        <p className="text-sm text-gray-500 dark:text-white/40 mb-4">Untuk: <strong className="text-gray-900 dark:text-white">{banModal.name}</strong></p>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Alasan ban (opsional)..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-ds-amber resize-none"
                        />
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setBanModal(null)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-500 dark:text-white/50">Batal</button>
                            <button
                                onClick={() => handleBan(banModal.id, reason)}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-all"
                            >
                                Ban User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function AdminUsersPage() {
    return <Suspense><UserList /></Suspense>;
}
