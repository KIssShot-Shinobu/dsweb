"use client";

import { StatCard } from "@/components/dashboard/stat-card";

interface UserStats {
    total: number;
    pending: number;
    active: number;
    rejected: number;
    banned: number;
}

type QuickLink = {
    href: string;
    title: string;
    description: string;
    icon: string;
};

const QUICK_LINKS: QuickLink[] = [
    {
        href: "/dashboard/users?status=PENDING",
        title: "Review Pendaftaran",
        description: "Periksa user baru yang menunggu approval.",
        icon: "R",
    },
    {
        href: "/dashboard/users",
        title: "Users",
        description: "Kelola role, status, dan data user dari satu halaman.",
        icon: "U",
    },
    {
        href: "/dashboard/audit-logs",
        title: "Audit Logs",
        description: "Pantau perubahan penting sistem dan aktivitas operator.",
        icon: "A",
    },
];

export function OperationsOverview({
    stats,
    loading = false,
}: {
    stats: UserStats;
    loading?: boolean;
}) {
    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ringkasan Operasional</h2>
                <p className="text-sm text-gray-500 dark:text-white/40">
                    Approval user dan kontrol utama dashboard disatukan di halaman ini.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
                <StatCard label="Total User" value={loading ? "..." : stats.total} icon="U" change="Seluruh akun terdaftar" primary />
                <StatCard label="Pending" value={loading ? "..." : stats.pending} icon="P" change="Menunggu review" />
                <StatCard label="Aktif" value={loading ? "..." : stats.active} icon="A" change="Sudah disetujui" />
                <StatCard label="Ditolak" value={loading ? "..." : stats.rejected} icon="X" change="Registrasi ditolak" changeType="negative" />
                <StatCard label="Banned" value={loading ? "..." : stats.banned} icon="B" change="Akun diblokir" changeType="negative" />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {QUICK_LINKS.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        className="group rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:border-ds-amber/40 hover:bg-gray-50 dark:border-white/5 dark:bg-[#1a1a1a] dark:hover:bg-white/[0.03]"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ds-amber/10 text-lg font-bold text-ds-amber">
                                {link.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-base font-semibold text-gray-900 transition-colors group-hover:text-ds-amber dark:text-white">
                                    {link.title}
                                </div>
                                <p className="mt-1 text-sm text-gray-500 dark:text-white/40">
                                    {link.description}
                                </p>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </section>
    );
}
