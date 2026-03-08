"use client";

import { StatCard } from "@/components/dashboard/stat-card";

interface UserStats {
    total: number;
    active: number;
    banned: number;
    guildMembers: number;
    assignedToTeam: number;
    teams: number;
    activeTeams: number;
}

type QuickLink = {
    href: string;
    title: string;
    description: string;
    icon: string;
};

const QUICK_LINKS: QuickLink[] = [
    {
        href: "/dashboard/users",
        title: "Users",
        description: "Kelola akun publik, role komunitas, dan status user dari satu halaman.",
        icon: "U",
    },
    {
        href: "/dashboard/teams",
        title: "Teams",
        description: "Atur roster Duel Standby tanpa mencampur status member dengan afiliasi team.",
        icon: "G",
    },
    {
        href: "/dashboard/audit-logs",
        title: "Audit Logs",
        description: "Pantau perubahan penting sistem dan aktivitas operator.",
        icon: "A",
    },
];

export function OperationsOverview({ stats, loading = false }: { stats: UserStats; loading?: boolean }) {
    return (
        <section className="rounded-3xl border border-black/5 bg-white/86 p-5 shadow-sm dark:border-white/6 dark:bg-white/[0.035] sm:p-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Ringkasan Operasional</h2>
                <p className="text-sm text-slate-500 dark:text-white/45">
                    Kontrol utama dashboard disatukan di halaman ini tanpa mencampur akun publik, member Duel Standby, dan roster team.
                </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Total User" value={loading ? "..." : stats.total} icon="U" change="Seluruh akun terdaftar" primary />
                <StatCard label="Guild Members" value={loading ? "..." : stats.guildMembers} icon="M" change="Member Duel Standby" />
                <StatCard label="Assigned Team" value={loading ? "..." : stats.assignedToTeam} icon="T" change="Member yang sudah masuk team" />
                <StatCard label="Aktif" value={loading ? "..." : stats.active} icon="A" change="Akun siap dipakai" />
                <StatCard label="Teams" value={loading ? "..." : stats.teams} icon="G" change={`${loading ? "..." : stats.activeTeams} team aktif`} />
                <StatCard label="Banned" value={loading ? "..." : stats.banned} icon="B" change="Akun diblokir" changeType="negative" />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
                {QUICK_LINKS.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        className="group rounded-2xl border border-black/5 bg-slate-50/80 p-5 transition-all hover:-translate-y-0.5 hover:border-ds-amber/35 hover:bg-white dark:border-white/8 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ds-amber/15 text-lg font-bold text-ds-amber">
                                {link.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-base font-semibold text-slate-950 transition-colors group-hover:text-ds-amber dark:text-white">
                                    {link.title}
                                </div>
                                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-white/45">{link.description}</p>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </section>
    );
}
