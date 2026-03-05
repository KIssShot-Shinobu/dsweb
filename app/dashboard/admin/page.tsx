"use client";

import { useEffect, useState } from "react";

interface UserStats {
    total: number;
    pending: number;
    active: number;
    rejected: number;
    banned: number;
}

export default function AdminPage() {
    const [stats, setStats] = useState<UserStats>({ total: 0, pending: 0, active: 0, rejected: 0, banned: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/admin/users?status=ALL&perPage=1").then((r) => r.json()),
            fetch("/api/admin/users?status=PENDING&perPage=1").then((r) => r.json()),
            fetch("/api/admin/users?status=ACTIVE&perPage=1").then((r) => r.json()),
            fetch("/api/admin/users?status=REJECTED&perPage=1").then((r) => r.json()),
            fetch("/api/admin/users?status=BANNED&perPage=1").then((r) => r.json()),
        ]).then(([all, pending, active, rejected, banned]) => {
            setStats({
                total: all.total || 0,
                pending: pending.total || 0,
                active: active.total || 0,
                rejected: rejected.total || 0,
                banned: banned.total || 0,
            });
            setLoading(false);
        });
    }, []);

    const cards = [
        { label: "Total Registrasi", value: stats.total, color: "bg-ds-amber text-black", icon: "👥" },
        { label: "Menunggu Review", value: stats.pending, color: "bg-yellow-500/10 border border-yellow-500/20", textColor: "text-yellow-400", icon: "⏳" },
        { label: "Aktif", value: stats.active, color: "bg-emerald-500/10 border border-emerald-500/20", textColor: "text-emerald-400", icon: "✅" },
        { label: "Ditolak", value: stats.rejected, color: "bg-red-500/10 border border-red-500/20", textColor: "text-red-400", icon: "❌" },
    ];

    return (
        <>
            <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
                <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Overview sistem registrasi guild</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                {cards.map((card) => (
                    <div key={card.label} className={`rounded-2xl p-4 md:p-5 ${card.color}`}>
                        <div className="text-2xl mb-2">{card.icon}</div>
                        {loading ? (
                            <div className="h-8 w-12 rounded-lg bg-white/20 animate-pulse mb-1" />
                        ) : (
                            <div className={`text-3xl font-bold mb-1 ${card.textColor || ""}`}>{card.value}</div>
                        )}
                        <div className={`text-xs font-semibold uppercase tracking-wider ${card.textColor ? card.textColor + "/70" : "opacity-70"}`}>{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href="/dashboard/admin/users?status=PENDING" className="group bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 p-5 hover:border-ds-amber/50 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-2xl">⏳</div>
                        <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white group-hover:text-ds-amber transition-colors">Review Pendaftaran</div>
                            <div className="text-sm text-gray-400 dark:text-white/40">{loading ? "..." : `${stats.pending} menunggu persetujuan`}</div>
                        </div>
                        <span className="text-white/20 group-hover:text-ds-amber transition-colors">→</span>
                    </div>
                </a>
                <a href="/dashboard/admin/users" className="group bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 p-5 hover:border-ds-amber/50 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-ds-amber/10 flex items-center justify-center text-2xl">👤</div>
                        <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white group-hover:text-ds-amber transition-colors">Semua Pengguna</div>
                            <div className="text-sm text-gray-400 dark:text-white/40">{loading ? "..." : `${stats.total} total terdaftar`}</div>
                        </div>
                        <span className="text-white/20 group-hover:text-ds-amber transition-colors">→</span>
                    </div>
                </a>
            </div>
        </>
    );
}
