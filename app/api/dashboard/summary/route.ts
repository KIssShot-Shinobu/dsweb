import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { activeTeamMembershipSelect, getActiveTeamSnapshot } from "@/lib/team-membership";

function buildWeeklyChart(transactions: { amount: number; createdAt: Date }[]) {
    const days = [];

    for (let i = 6; i >= 0; i -= 1) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayTransactions = transactions.filter(
            (transaction) => transaction.createdAt >= date && transaction.createdAt < nextDate
        );

        days.push({
            label: date.toLocaleDateString("id-ID", { weekday: "short" }).slice(0, 2),
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

function getTournamentPriority(status: string) {
    if (status === "ONGOING") return 0;
    if (status === "OPEN") return 1;
    if (status === "COMPLETED") return 2;
    return 3;
}

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        const weeklyStart = new Date();
        weeklyStart.setHours(0, 0, 0, 0);
        weeklyStart.setDate(weeklyStart.getDate() - 6);

        const [
            totalUsers,
            activeUsers,
            bannedUsers,
            totalGuildMembers,
            assignedGuildMembers,
            totalTeams,
            activeTeams,
            openTournaments,
            ongoingTournaments,
            completedTournaments,
            recentActiveUsers,
            recentTournaments,
            treasuryAggregate,
            recentTreasury,
            weeklyTransactions,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { status: "ACTIVE" } }),
            prisma.user.count({ where: { status: "BANNED" } }),
            prisma.user.count({ where: { role: { in: ["MEMBER", "OFFICER", "ADMIN", "FOUNDER"] } } }),
            prisma.user.count({
                where: {
                    role: { in: ["MEMBER", "OFFICER", "ADMIN", "FOUNDER"] },
                    teamMemberships: {
                        some: { leftAt: null },
                    },
                },
            }),
            prisma.team.count(),
            prisma.team.count({ where: { isActive: true } }),
            prisma.tournament.count({ where: { status: "OPEN" } }),
            prisma.tournament.count({ where: { status: "ONGOING" } }),
            prisma.tournament.count({ where: { status: "COMPLETED" } }),
            prisma.user.findMany({
                where: { status: "ACTIVE" },
                select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                    role: true,
                    ...activeTeamMembershipSelect,
                    playerGameAccounts: {
                        select: {
                            game: { select: { code: true, name: true } },
                            gamePlayerId: true,
                            ign: true,
                        },
                        orderBy: { createdAt: "asc" },
                    },
                    lastActiveAt: true,
                    createdAt: true,
                },
                orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }],
                take: 5,
            }),
            prisma.tournament.findMany({
                orderBy: [{ createdAt: "desc" }],
                take: 12,
                include: {
                    game: { select: { code: true, name: true } },
                    _count: {
                        select: { participants: true },
                    },
                },
            }),
            prisma.treasury.aggregate({
                _sum: { amount: true },
            }),
            prisma.treasury.findMany({
                orderBy: { createdAt: "desc" },
                take: 3,
                include: {
                    user: {
                        select: {
                            fullName: true,
                        },
                    },
                },
            }),
            prisma.treasury.findMany({
                where: {
                    createdAt: {
                        gte: weeklyStart,
                    },
                },
                select: {
                    amount: true,
                    createdAt: true,
                },
            }),
        ]);

        const mappedRecentTournaments = recentTournaments.map((tournament) => ({
            ...tournament,
            gameType: tournament.game?.code ?? "",
            gameName: tournament.game?.name ?? "",
            startAt: tournament.startAt.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            summary: {
                stats: {
                    totalActiveUsers: activeUsers,
                    openTournaments,
                    activeTournaments: ongoingTournaments,
                    completedTournaments,
                    treasuryBalance: treasuryAggregate._sum.amount || 0,
                },
                userStats: {
                    total: totalUsers,
                    active: activeUsers,
                    banned: bannedUsers,
                    guildMembers: totalGuildMembers,
                    assignedToTeam: assignedGuildMembers,
                    teams: totalTeams,
                    activeTeams,
                },
                recentActiveUsers: recentActiveUsers.map((user) => {
                    const { playerGameAccounts, ...userData } = user;
                    const gameProfiles = (playerGameAccounts || []).map((account) => ({
                        gameType: account.game.code,
                        gameName: account.game.name,
                        gameId: account.gamePlayerId,
                        ign: account.ign,
                    }));
                    return {
                        ...userData,
                        gameProfiles,
                        team: getActiveTeamSnapshot(user).team,
                    };
                }),
                recentTournaments: mappedRecentTournaments
                    .sort((left, right) => {
                        const statusOrder = getTournamentPriority(left.status) - getTournamentPriority(right.status);
                        if (statusOrder !== 0) return statusOrder;
                        return new Date(left.startAt).getTime() - new Date(right.startAt).getTime();
                    })
                    .slice(0, 5),
                treasury: {
                    balance: treasuryAggregate._sum.amount || 0,
                    recentTransactions: recentTreasury,
                    weeklyChart: buildWeeklyChart(weeklyTransactions),
                },
            },
        });
    } catch (error) {
        console.error("[Dashboard Summary API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
