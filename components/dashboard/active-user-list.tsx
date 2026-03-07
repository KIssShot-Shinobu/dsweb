"use client";

import { DashboardEmptyState, DashboardPanel } from "@/components/dashboard/page-shell";

interface ActiveUser {
    id: string;
    fullName: string;
    role: string;
    gameProfiles: { gameId: string; ign?: string; gameType?: string }[];
}

const getRoleBadge = (role: string) => {
    switch (role.toUpperCase()) {
        case "FOUNDER":
        case "ADMIN":
            return "bg-ds-amber/20 text-ds-amber border-ds-amber/30";
        case "OFFICER":
            return "bg-purple-500/10 text-purple-400 border-purple-400/20";
        default:
            return "bg-blue-500/10 text-blue-400 border-blue-400/20";
    }
};

export function ActiveUserList({
    users,
    loading = false,
}: {
    users: ActiveUser[];
    loading?: boolean;
}) {
    const getInitials = (name: string) =>
        name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

    return (
        <DashboardPanel
            title="Active Users"
            description="Snapshot akun aktif terbaru beserta identitas game utamanya."
            action={
                <a href="/dashboard/users?status=ACTIVE" className="inline-flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70 dark:hover:bg-white/[0.06]">
                    View All
                </a>
            }
        >
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50/80 p-3 dark:border-white/6 dark:bg-white/[0.03]">
                            <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/8" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-200 dark:bg-white/8" />
                                <div className="h-2.5 w-2/5 animate-pulse rounded-full bg-slate-200 dark:bg-white/8" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : users.length === 0 ? (
                <DashboardEmptyState
                    title="Belum ada active users"
                    description="Akun aktif guild akan muncul di sini setelah registrasi dan login mulai berjalan."
                    actionHref="/dashboard/users"
                    actionLabel="Buka halaman users"
                />
            ) : (
                <div className="space-y-3">
                    {users.map((user) => (
                        <div key={user.id} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50/80 p-3 transition-all hover:bg-white dark:border-white/6 dark:bg-white/[0.03] dark:hover:bg-white/[0.05] sm:p-4">
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-ds-amber text-sm font-bold text-black">
                                {getInitials(user.fullName)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{user.fullName}</div>
                                <div className="truncate text-xs text-slate-400 dark:text-white/40">
                                    {user.gameProfiles[0]?.ign || user.gameProfiles[0]?.gameId || "Belum ada game profile"}
                                </div>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getRoleBadge(user.role)}`}>
                                {user.role}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </DashboardPanel>
    );
}
