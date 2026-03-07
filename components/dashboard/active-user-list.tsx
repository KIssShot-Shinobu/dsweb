"use client";

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
        name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2);

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1a1a1a]">
                <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/5">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Active Users</span>
                </div>
                <div className="space-y-3 p-5">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse dark:bg-white/5" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-3/5 rounded-full bg-gray-100 animate-pulse dark:bg-white/5" />
                                <div className="h-2.5 w-2/5 rounded-full bg-gray-100 animate-pulse dark:bg-white/5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1a1a1a]">
            <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/5">
                <span className="text-base font-semibold text-gray-900 dark:text-white">Active Users</span>
                <a href="/dashboard/users?status=ACTIVE" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5">
                    View All
                </a>
            </div>
            <div className="p-5">
                {users.length === 0 ? (
                    <div className="py-8 text-center">
                        <div className="mb-2 text-3xl">Users</div>
                        <div className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">No active users yet</div>
                        <p className="text-xs text-gray-400">Approved active users will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ds-amber text-xs font-bold text-black">
                                    {getInitials(user.fullName)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user.fullName}</div>
                                    <div className="truncate text-xs text-gray-400 dark:text-white/40">
                                        {user.gameProfiles[0]?.ign || user.gameProfiles[0]?.gameId || "-"}
                                    </div>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(user.role)}`}>
                                    {user.role}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
