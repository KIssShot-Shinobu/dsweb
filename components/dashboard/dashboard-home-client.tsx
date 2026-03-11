"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActiveUserList } from "@/components/dashboard/active-user-list";
import { TournamentList } from "@/components/dashboard/tournament-list";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { OperationsOverview } from "@/components/dashboard/operations-overview";
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, dashboardStackCls } from "@/components/dashboard/form-styles";
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
        active: number;
        banned: number;
        guildMembers: number;
        assignedToTeam: number;
        teams: number;
        activeTeams: number;
    };
    recentActiveUsers: {
        id: string;
        fullName: string;
        role: string;
        team: { id: string; name: string; slug: string } | null;
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
        active: 0,
        banned: 0,
        guildMembers: 0,
        assignedToTeam: 0,
        teams: 0,
        activeTeams: 0,
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
        <DashboardPageShell>
            <div className={dashboardStackCls}>
                <DashboardPageHeader
                    kicker="Operations Center"
                    title="Dashboard"
                    description="Kelola akun publik, member Duel Standby, roster team, tournament, treasury, dan aktivitas sistem dari satu workspace yang lebih ringkas dan konsisten."
                    actions={(
                        <>
                            <a href="/dashboard/tournaments" className={btnPrimary}>
                                + New Tournament
                            </a>
                            <a href="/dashboard/users" className={btnOutline}>
                                Manage Users
                            </a>
                        </>
                    )}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <StatCard label="Active Users" value={loading ? "..." : summary.stats.totalActiveUsers} icon="U" change="Akun aktif siap ikut flow publik" primary />
                    <StatCard label="Open Tournaments" value={loading ? "..." : summary.stats.openTournaments} icon="O" change="Registrasi dibuka" />
                    <StatCard label="Active Tournaments" value={loading ? "..." : summary.stats.activeTournaments} icon="A" change="Sedang berjalan" />
                    <StatCard label="Completed" value={loading ? "..." : summary.stats.completedTournaments} icon="C" change="Turnamen selesai" />
                    <StatCard label="Treasury Balance" value={loading ? "..." : formatCurrency(summary.stats.treasuryBalance)} icon="Rp" change="Saldo kas guild" />
                </div>

                <OperationsOverview stats={summary.userStats} loading={loading} />

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <AnalyticsChart data={summary.treasury.weeklyChart} loading={loading} />
                    <TreasuryCard balance={summary.treasury.balance} recentTransactions={summary.treasury.recentTransactions} loading={loading} />
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <ActiveUserList users={summary.recentActiveUsers} loading={loading} />
                    <TournamentList tournaments={summary.recentTournaments} loading={loading} />
                </div>
            </div>
        </DashboardPageShell>
    );
}
