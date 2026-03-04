"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { MemberList } from "@/components/dashboard/member-list";
import { TournamentList } from "@/components/dashboard/tournament-list";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";

interface Stats {
    totalMembers: number;
    activeTournaments: number;
    completedTournaments: number;
    pendingTournaments: number;
    treasuryBalance: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({
        totalMembers: 0,
        activeTournaments: 0,
        completedTournaments: 0,
        pendingTournaments: 0,
        treasuryBalance: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/members").then((r) => r.json()),
            fetch("/api/tournaments").then((r) => r.json()),
            fetch("/api/treasury").then((r) => r.json()),
        ])
            .then(([members, tournaments, treasury]) => {
                setStats({
                    totalMembers: Array.isArray(members) ? members.length : 0,
                    activeTournaments: Array.isArray(tournaments)
                        ? tournaments.filter((t: { status: string }) => t.status === "ONGOING").length
                        : 0,
                    completedTournaments: Array.isArray(tournaments)
                        ? tournaments.filter((t: { status: string }) => t.status === "COMPLETED").length
                        : 0,
                    pendingTournaments: Array.isArray(tournaments)
                        ? tournaments.filter((t: { status: string }) => t.status === "UPCOMING").length
                        : 0,
                    treasuryBalance: treasury.balance || 0,
                });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const formatCurrency = (amount: number) => {
        if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}M`;
        if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)}K`;
        return `Rp ${amount}`;
    };

    return (
        <>
            {/* Page Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Kelola guild DuelStandby dengan mudah</p>
                </div>
                <div className="flex gap-2">
                    <a href="/dashboard/tournaments" className="px-4 py-2 rounded-xl bg-ds-amber hover:bg-ds-gold text-black font-semibold text-sm transition-all">
                        + New Tournament
                    </a>
                    <a href="/dashboard/members" className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium transition-all">
                        Add Member
                    </a>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Members" value={loading ? "..." : stats.totalMembers} icon="👥" change="Guild members" primary />
                <StatCard label="Active Tournaments" value={loading ? "..." : stats.activeTournaments} icon="🏆" change="Ongoing now" />
                <StatCard label="Completed" value={loading ? "..." : stats.completedTournaments} icon="✅" change="Tournaments finished" />
                <StatCard label="Treasury Balance" value={loading ? "..." : formatCurrency(stats.treasuryBalance)} icon="💰" change="Current balance" />
            </div>

            {/* Content Grid - Row 1 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <AnalyticsChart />
                <TreasuryCard />
            </div>

            {/* Content Grid - Row 2 */}
            <div className="grid grid-cols-2 gap-4">
                <MemberList />
                <TournamentList />
            </div>
        </>
    );
}
