"use client";

import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { useLocale } from "@/hooks/use-locale";

interface UserStats {
    total: number;
    active: number;
    banned: number;
    guildMembers: number;
    assignedToTeam: number;
    teams: number;
    activeTeams: number;
}

export function OperationsOverview({ stats, loading = false }: { stats: UserStats; loading?: boolean }) {
    const { t } = useLocale();
    const quickLinks = [
        {
            href: "/dashboard/users",
            title: t.dashboard.operations.quickLinks.usersTitle,
            description: t.dashboard.operations.quickLinks.usersDescription,
            icon: "U",
        },
        {
            href: "/dashboard/teams",
            title: t.dashboard.operations.quickLinks.teamsTitle,
            description: t.dashboard.operations.quickLinks.teamsDescription,
            icon: "G",
        },
        {
            href: "/dashboard/audit-logs",
            title: t.dashboard.operations.quickLinks.auditTitle,
            description: t.dashboard.operations.quickLinks.auditDescription,
            icon: "A",
        },
    ];

    return (
        <section className="card border border-base-300 bg-base-100 shadow-md">
            <div className="card-body p-5 sm:p-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-black tracking-tight text-base-content">{t.dashboard.operations.title}</h2>
                    <p className="text-sm text-base-content/60">{t.dashboard.operations.description}</p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <StatCard label={t.dashboard.operations.stats.totalUsers} value={loading ? "..." : stats.total} icon="U" change={t.dashboard.operations.stats.totalUsersMeta} primary />
                    <StatCard label={t.dashboard.operations.stats.guildMembers} value={loading ? "..." : stats.guildMembers} icon="M" change={t.dashboard.operations.stats.guildMembersMeta} />
                    <StatCard label={t.dashboard.operations.stats.assignedTeam} value={loading ? "..." : stats.assignedToTeam} icon="T" change={t.dashboard.operations.stats.assignedTeamMeta} />
                    <StatCard label={t.dashboard.operations.stats.active} value={loading ? "..." : stats.active} icon="A" change={t.dashboard.operations.stats.activeMeta} />
                    <StatCard label={t.dashboard.operations.stats.teams} value={loading ? "..." : stats.teams} icon="G" change={loading ? "..." : t.dashboard.operations.stats.teamsMeta(stats.activeTeams)} />
                    <StatCard label={t.dashboard.operations.stats.banned} value={loading ? "..." : stats.banned} icon="B" change={t.dashboard.operations.stats.bannedMeta} changeType="negative" />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
                    {quickLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="group rounded-box border border-base-300 bg-base-200/40 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-base-100"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-lg font-bold text-primary">
                                    {link.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-base font-semibold text-base-content transition-colors group-hover:text-primary">
                                        {link.title}
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-base-content/60">{link.description}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
