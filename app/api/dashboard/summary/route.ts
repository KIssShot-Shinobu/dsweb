import { NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
            pendingUsers,
            activeUsers,
            rejectedUsers,
            bannedUsers,
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
            prisma.user.count({ where: { status: "PENDING" } }),
            prisma.user.count({ where: { status: "ACTIVE" } }),
            prisma.user.count({ where: { status: "REJECTED" } }),
            prisma.user.count({ where: { status: "BANNED" } }),
            prisma.tournament.count({ where: { status: "OPEN" } }),
            prisma.tournament.count({ where: { status: "ONGOING" } }),
            prisma.tournament.count({ where: { status: "COMPLETED" } }),
            prisma.user.findMany({
                where: { status: "ACTIVE" },
                select: {
                    id: true,
                    fullName: true,
                    role: true,
                    gameProfiles: {
                        select: { gameId: true, ign: true, gameType: true },
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
                    pending: pendingUsers,
                    active: activeUsers,
                    rejected: rejectedUsers,
                    banned: bannedUsers,
                },
                recentActiveUsers,
                recentTournaments: recentTournaments
                    .sort((left, right) => {
                        const statusOrder = getTournamentPriority(left.status) - getTournamentPriority(right.status);
                        if (statusOrder !== 0) return statusOrder;
                        return new Date(left.startDate).getTime() - new Date(right.startDate).getTime();
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
