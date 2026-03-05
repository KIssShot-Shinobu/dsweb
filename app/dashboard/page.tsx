"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { MemberList } from "@/components/dashboard/member-list";
import { TournamentList } from "@/components/dashboard/tournament-list";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";

const ADMIN_ROLES = ["ADMIN", "FOUNDER"];

interface Stats {
    totalMembers: number;
    activeTournaments: number;
    completedTournaments: number;
    pendingTournaments: number;
    treasuryBalance: number;
}

interface ChartItem {
    label: string;
    income: number;
    expense: number;
}

// Build last-7-days chart data from transaction list
function buildChartData(transactions: { amount: number; createdAt: string }[]): ChartItem[] {
    const days: ChartItem[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString("id-ID", { weekday: "short" }).slice(0, 2);
        const dateStr = d.toISOString().split("T")[0];
        const dayTx = transactions.filter((t) => t.createdAt.startsWith(dateStr));
        days.push({
            label,
            income: dayTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
            expense: Math.abs(dayTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
        });
    }
    return days;
}

export default function DashboardPage() {
    const router = useRouter();
    const [roleChecked, setRoleChecked] = useState(false);
    const [stats, setStats] = useState<Stats>({
        totalMembers: 0,
        activeTournaments: 0,
        completedTournaments: 0,
        pendingTournaments: 0,
        treasuryBalance: 0,
    });
    const [chartData, setChartData] = useState<ChartItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Redirect non-admin users to profile page
    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => {
                if (!d.success || !d.user || !ADMIN_ROLES.includes(d.user.role)) {
                    router.replace("/dashboard/profile");
                } else {
                    setRoleChecked(true);
                }
            })
            .catch(() => router.replace("/dashboard/profile"));
    }, [router]);

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
                setChartData(buildChartData(treasury.transactions || []));
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
            {/* Spinner while checking role */}
            {!roleChecked && (
                <div className="flex items-center justify-center min-h-64">
                    <div className="w-8 h-8 rounded-full border-2 border-ds-amber border-t-transparent animate-spin" />
                </div>
            )}

            {/* Admin dashboard — only shown when role verified */}
            {roleChecked && (
                <>
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-3">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                            <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Kelola guild DuelStandby dengan mudah</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <a href="/dashboard/tournaments" className="px-4 py-2 rounded-xl bg-ds-amber hover:bg-ds-gold text-black font-semibold text-sm transition-all">
                                + New Tournament
                            </a>
                            <a href="/dashboard/members" className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium transition-all">
                                Add Member
                            </a>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
                        <StatCard label="Total Members" value={loading ? "..." : stats.totalMembers} icon="👥" change="Guild members" primary />
                        <StatCard label="Active Tournaments" value={loading ? "..." : stats.activeTournaments} icon="🏆" change="Ongoing now" />
                        <StatCard label="Completed" value={loading ? "..." : stats.completedTournaments} icon="✅" change="Tournaments finished" />
                        <StatCard label="Treasury Balance" value={loading ? "..." : formatCurrency(stats.treasuryBalance)} icon="💰" change="Current balance" />
                    </div>

                    {/* Content Grid - Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <AnalyticsChart data={chartData} />
                        <TreasuryCard />
                    </div>

                    {/* Content Grid - Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <MemberList />
                        <TournamentList />
                    </div>
                </>
            )}
        </>
    );
}
