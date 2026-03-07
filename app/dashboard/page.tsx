"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActiveUserList } from "@/components/dashboard/active-user-list";
import { TournamentList } from "@/components/dashboard/tournament-list";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { OperationsOverview } from "@/components/dashboard/operations-overview";
import { useCurrentUser } from "@/hooks/use-current-user";

const ADMIN_ROLES = ["ADMIN", "FOUNDER"];

interface DashboardSummary {
    stats: {
        totalActiveUsers: number;
        activeTournaments: number;
        completedTournaments: number;
        openTournaments: number;
        treasuryBalance: number;
    };
    userStats: {
        total: number;
        pending: number;
        active: number;
        rejected: number;
        banned: number;
    };
    recentActiveUsers: {
        id: string;
        fullName: string;
        role: string;
        gameProfiles: { gameId: string; ign?: string; gameType?: string }[];
    }[];
    recentTournaments: {
        id: string;
        title: string;
        gameType: string;
        status: string;
        startDate: string;
        prizePool: number;
        _count?: { participants: number };
    }[];
    treasury: {
        balance: number;
        recentTransactions: {
            id: string;
            amount: number;
            description: string;
            createdAt: string;
            user: { fullName: string } | null;
        }[];
        weeklyChart: {
            label: string;
            income: number;
            expense: number;
        }[];
    };
}

const EMPTY_SUMMARY: DashboardSummary = {
    stats: {
        totalActiveUsers: 0,
        activeTournaments: 0,
        completedTournaments: 0,
        openTournaments: 0,
        treasuryBalance: 0,
    },
    userStats: {
        total: 0,
        pending: 0,
        active: 0,
        rejected: 0,
        banned: 0,
    },
    recentActiveUsers: [],
    recentTournaments: [],
    treasury: {
        balance: 0,
        recentTransactions: [],
        weeklyChart: [],
    },
};

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading: userLoading } = useCurrentUser();
    const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
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

        fetch("/api/dashboard/summary")
            .then((response) => response.json())
            .then((data) => {
                if (!active) return;
                setSummary(data.summary || EMPTY_SUMMARY);
            })
            .catch(() => {
                if (!active) return;
                setSummary(EMPTY_SUMMARY);
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
            <div className="flex min-h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-ds-amber border-t-transparent" />
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
                <div className="flex flex-shrink-0 gap-2">
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

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-5">
                <StatCard label="Active Users" value={loading ? "..." : summary.stats.totalActiveUsers} icon="U" change="Akun aktif guild" primary />
                <StatCard label="Open Tournaments" value={loading ? "..." : summary.stats.openTournaments} icon="O" change="Registrasi dibuka" />
                <StatCard label="Active Tournaments" value={loading ? "..." : summary.stats.activeTournaments} icon="A" change="Sedang berjalan" />
                <StatCard label="Completed" value={loading ? "..." : summary.stats.completedTournaments} icon="C" change="Turnamen selesai" />
                <StatCard label="Treasury Balance" value={loading ? "..." : formatCurrency(summary.stats.treasuryBalance)} icon="Rp" change="Saldo kas guild" />
            </div>

            <div className="mb-5">
                <OperationsOverview stats={summary.userStats} loading={loading} />
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AnalyticsChart data={summary.treasury.weeklyChart} loading={loading} />
                <TreasuryCard
                    balance={summary.treasury.balance}
                    recentTransactions={summary.treasury.recentTransactions}
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ActiveUserList users={summary.recentActiveUsers} loading={loading} />
                <TournamentList tournaments={summary.recentTournaments} loading={loading} />
            </div>
        </>
    );
}
