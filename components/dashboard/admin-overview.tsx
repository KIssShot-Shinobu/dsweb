"use client";

import { useEffect, useState } from "react";
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
        icon: "⏳",
    },
    {
        href: "/dashboard/users",
        title: "Users",
        description: "Kelola role, status, dan data user dari satu halaman.",
        icon: "👤",
    },
    {
        href: "/dashboard/audit-logs",
        title: "Audit Logs",
        description: "Pantau aktivitas admin dan perubahan penting sistem.",
        icon: "🧾",
    },
];

export function AdminOverview() {
    const [stats, setStats] = useState<UserStats>({
        total: 0,
        pending: 0,
        active: 0,
        rejected: 0,
        banned: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        Promise.all([
            fetch("/api/admin/users?status=ALL&perPage=1").then((r) => r.json()),
            fetch("/api/admin/users?status=PENDING&perPage=1").then((r) => r.json()),
            fetch("/api/admin/users?status=ACTIVE&perPage=1").then((r) => r.json()),
            fetch("/api/admin/users?status=REJECTED&perPage=1").then((r) => r.json()),
            fetch("/api/admin/users?status=BANNED&perPage=1").then((r) => r.json()),
        ])
            .then(([all, pending, activeUsers, rejected, banned]) => {
                if (!active) return;
                setStats({
                    total: all.total || 0,
                    pending: pending.total || 0,
                    active: activeUsers.total || 0,
                    rejected: rejected.total || 0,
                    banned: banned.total || 0,
                });
            })
            .finally(() => {
                if (!active) return;
                setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ringkasan Registrasi</h2>
                <p className="text-sm text-gray-500 dark:text-white/40">
                    Semua metrik approval user sekarang disatukan di dashboard utama.
                </p>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4">
                <StatCard label="Total User" value={loading ? "..." : stats.total} icon="👥" change="Seluruh akun terdaftar" primary />
                <StatCard label="Pending" value={loading ? "..." : stats.pending} icon="⏳" change="Menunggu review" />
                <StatCard label="Aktif" value={loading ? "..." : stats.active} icon="✅" change="Sudah disetujui" />
                <StatCard label="Ditolak" value={loading ? "..." : stats.rejected} icon="❌" change="Registrasi ditolak" changeType="negative" />
                <StatCard label="Banned" value={loading ? "..." : stats.banned} icon="🚫" change="Akun diblokir" changeType="negative" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {QUICK_LINKS.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        className="group rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a1a1a] p-5 hover:border-ds-amber/40 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-all"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ds-amber/10 text-2xl">
                                {link.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-ds-amber transition-colors">
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
