"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { MemberList } from "@/components/dashboard/member-list";
import { TournamentList } from "@/components/dashboard/tournament-list";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { useCurrentUser } from "@/hooks/use-current-user";

const ADMIN_ROLES = ["ADMIN", "FOUNDER"];

interface Stats {
    totalMembers: number;
    activeTournaments: number;
    completedTournaments: number;
    openTournaments: number;
    treasuryBalance: number;
}

interface ChartItem {
    label: string;
    income: number;
    expense: number;
}

function buildChartData(transactions: { amount: number; createdAt: string }[]): ChartItem[] {
    const days: ChartItem[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const label = date.toLocaleDateString("id-ID", { weekday: "short" }).slice(0, 2);
        const dateString = date.toISOString().split("T")[0];
        const dayTransactions = transactions.filter((transaction) => transaction.createdAt.startsWith(dateString));

        days.push({
            label,
            income: dayTransactions
                .filter((transaction) => transaction.amount > 0)
                .reduce((sum, transaction) => sum + transaction.amount, 0),
            expense: Math.abs(
                dayTransactions
                    .filter((transaction) => transaction.amount < 0)
                    .reduce((sum, transaction) => sum + transaction.amount, 0)
            ),
        });
    }
    return days;
}

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading: userLoading } = useCurrentUser();
    const [stats, setStats] = useState<Stats>({
        totalMembers: 0,
        activeTournaments: 0,
        completedTournaments: 0,
        openTournaments: 0,
        treasuryBalance: 0,
    });
    const [chartData, setChartData] = useState<ChartItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userLoading) return;
        if (!user || !ADMIN_ROLES.includes(user.role)) {
            router.replace("/dashboard/profile");
        }
    }, [router, user, userLoading]);

    useEffect(() => {
        if (!user || !ADMIN_ROLES.includes(user.role)) return;

        let active = true;
        setLoading(true);

        Promise.all([
            fetch("/api/admin/users?status=ACTIVE&role=ALL&perPage=1").then((response) => response.json()),
            fetch("/api/tournaments").then((response) => response.json()),
            fetch("/api/treasury").then((response) => response.json()),
        ])
            .then(([members, tournaments, treasury]) => {
                if (!active) return;

                setStats({
                    totalMembers: members.total || 0,
                    activeTournaments: Array.isArray(tournaments)
                        ? tournaments.filter((tournament: { status: string }) => tournament.status === "ONGOING").length
                        : 0,
                    completedTournaments: Array.isArray(tournaments)
                        ? tournaments.filter((tournament: { status: string }) => tournament.status === "COMPLETED").length
                        : 0,
                    openTournaments: Array.isArray(tournaments)
                        ? tournaments.filter((tournament: { status: string }) => tournament.status === "OPEN").length
                        : 0,
                    treasuryBalance: treasury.balance || 0,
                });
                setChartData(buildChartData(treasury.transactions || []));
            })
            .finally(() => {
                if (!active) return;
                setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [user]);

    const formatCurrency = (amount: number) => {
        if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}M`;
        if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)}K`;
        return `Rp ${amount}`;
    };

    if (userLoading || !user || !ADMIN_ROLES.includes(user.role)) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="w-8 h-8 rounded-full border-2 border-ds-amber border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">Dashboard</h1>
                    <p className="mt-0.5 text-sm text-gray-400 dark:text-white/40">
                        Kelola guild DuelStandby, approval user, dan operasional harian dari satu tempat.
                    </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <a href="/dashboard/tournaments" className="rounded-xl bg-ds-amber px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-ds-gold">
                        + New Tournament
                    </a>
                    <a href="/dashboard/users?status=PENDING" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5">
                        Review Users
                    </a>
                    <a href="/dashboard/users" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5">
                        Manage Users
                    </a>
                </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 md:gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Total Members" value={loading ? "..." : stats.totalMembers} icon="👥" change="Guild members" primary />
                <StatCard label="Open Tournaments" value={loading ? "..." : stats.openTournaments} icon="📅" change="Open registration" />
                <StatCard label="Active Tournaments" value={loading ? "..." : stats.activeTournaments} icon="🏆" change="Ongoing now" />
                <StatCard label="Completed" value={loading ? "..." : stats.completedTournaments} icon="✅" change="Tournaments finished" />
                <StatCard label="Treasury Balance" value={loading ? "..." : formatCurrency(stats.treasuryBalance)} icon="💰" change="Current balance" />
            </div>

            <div className="mb-5">
                <AdminOverview />
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AnalyticsChart data={chartData} />
                <TreasuryCard />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <MemberList />
                <TournamentList />
            </div>
        </>
    );
}
