import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { activeTeamMembershipSelect, getActiveTeamSnapshot } from "@/lib/team-membership";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            fullName: true,
            email: true,
            phoneWhatsapp: true,
            city: true,
            status: true,
            role: true,
            createdAt: true,
            lastLoginAt: true,
            playerGameAccounts: {
                select: {
                    game: { select: { code: true, name: true } },
                    gamePlayerId: true,
                    ign: true,
                    screenshotUrl: true,
                },
            },
            registrationLog: true,
            ...activeTeamMembershipSelect,
            auditLogs: {
                select: {
                    action: true,
                    reason: true,
                    createdAt: true,
                    user: { select: { fullName: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            },
        },
    });

    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    const activeTeam = getActiveTeamSnapshot(user);

    const { playerGameAccounts, ...userData } = user;
    const gameProfiles = (playerGameAccounts || []).map((account) => ({
        gameType: account.game.code,
        gameName: account.game.name,
        gameId: account.gamePlayerId,
        ign: account.ign,
        screenshotUrl: account.screenshotUrl,
    }));

    return NextResponse.json({
        success: true,
        data: {
            ...userData,
            gameProfiles,
            teamId: activeTeam.teamId,
            teamJoinedAt: activeTeam.teamJoinedAt,
            team: activeTeam.team,
        },
    });
}
