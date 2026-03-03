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
        if (amount >= 1000000) {
            return `Rp ${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `Rp ${(amount / 1000).toFixed(0)}K`;
        }
        return `Rp ${amount}`;
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">
                        Kelola guild DuelStandby dengan mudah
                    </p>
                </div>
                <div className="page-actions">
                    <a href="/dashboard/tournaments" className="btn btn-primary">
                        + New Tournament
                    </a>
                    <a href="/dashboard/members" className="btn btn-outline">
                        Add Member
                    </a>
                </div>
            </div>

            <div className="stats-grid">
                <StatCard
                    label="Total Members"
                    value={loading ? "..." : stats.totalMembers}
                    icon="👥"
                    change="Guild members"
                    primary
                />
                <StatCard
                    label="Active Tournaments"
                    value={loading ? "..." : stats.activeTournaments}
                    icon="🏆"
                    change="Ongoing now"
                />
                <StatCard
                    label="Completed"
                    value={loading ? "..." : stats.completedTournaments}
                    icon="✅"
                    change="Tournaments finished"
                />
                <StatCard
                    label="Treasury Balance"
                    value={loading ? "..." : formatCurrency(stats.treasuryBalance)}
                    icon="💰"
                    change="Current balance"
                />
            </div>

            <div className="dashboard-grid">
                <AnalyticsChart />
                <TreasuryCard />
            </div>

            <div className="dashboard-grid" style={{ marginTop: "1.5rem" }}>
                <MemberList />
                <TournamentList />
            </div>
        </>
    );
}
