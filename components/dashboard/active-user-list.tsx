"use client";

import Link from "next/link";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { DashboardEmptyState, DashboardPanel } from "@/components/dashboard/page-shell";
import { useLocale } from "@/hooks/use-locale";

interface ActiveUser {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    role: string;
    team: { id: string; name: string; slug: string } | null;
    gameProfiles: { gameId: string; ign?: string; gameType?: string }[];
}

const getRoleBadge = (role: string) => {
    switch (role.toUpperCase()) {
        case "FOUNDER":
        case "ADMIN":
            return "badge-warning";
        case "OFFICER":
            return "badge-secondary";
        case "MEMBER":
            return "badge-info";
        default:
            return "badge-ghost";
    }
};

export function ActiveUserList({
    users,
    loading = false,
}: {
    users: ActiveUser[];
    loading?: boolean;
}) {
    const { t } = useLocale();
    const getInitials = (name: string) =>
        name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

    return (
        <DashboardPanel
            title={t.dashboard.activeUsers.title}
            description={t.dashboard.activeUsers.description}
            action={
                <Link href="/dashboard/users?status=ACTIVE" className="btn btn-outline btn-sm rounded-box">
                    {t.dashboard.activeUsers.viewAll}
                </Link>
            }
        >
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3">
                            <div className="skeleton h-10 w-10 rounded-2xl" />
                            <div className="flex-1 space-y-2">
                                <div className="skeleton h-3 w-3/5" />
                                <div className="skeleton h-2.5 w-2/5" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : users.length === 0 ? (
                <DashboardEmptyState
                    title={t.dashboard.activeUsers.emptyTitle}
                    description={t.dashboard.activeUsers.emptyDescription}
                    actionHref="/dashboard/users"
                    actionLabel={t.dashboard.activeUsers.emptyAction}
                />
            ) : (
                <div className="space-y-3">
                    {users.map((user) => {
                        const avatarUrl = normalizeAssetUrl(user.avatarUrl);

                        return (
                            <div key={user.id} className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3 transition-all hover:border-primary/20 hover:bg-base-100 sm:p-4">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={user.fullName}
                                        className="h-11 w-11 flex-shrink-0 rounded-2xl border border-base-300 object-cover"
                                    />
                                ) : (
                                    <div className="badge badge-primary h-11 w-11 rounded-2xl border-0 text-sm font-bold text-primary-content">
                                        {getInitials(user.fullName)}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-base-content">{user.fullName}</div>
                                    <div className="truncate text-xs text-base-content/55">
                                        {user.gameProfiles[0]?.ign || user.gameProfiles[0]?.gameId || t.dashboard.activeUsers.noGameProfile}
                                    </div>
                                    <div className="truncate text-[11px] text-base-content/45">
                                        {user.team
                                            ? t.dashboard.activeUsers.teamLabel(user.team.name)
                                            : user.role === "USER"
                                              ? t.dashboard.activeUsers.publicUser
                                              : t.dashboard.activeUsers.noTeam}
                                    </div>
                                </div>
                                <span className={`badge h-auto px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getRoleBadge(user.role)}`}>
                                    {user.role}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </DashboardPanel>
    );
}
