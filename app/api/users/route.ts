import { NextRequest, NextResponse } from "next/server";
import { Prisma, type UserRole, type UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { activeTeamMembershipSelect, getActiveTeamSnapshot } from "@/lib/team-membership";
import { usersQuerySchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = usersQuerySchema.safeParse({
        status: searchParams.get("status") || undefined,
        role: searchParams.get("role") || undefined,
        teamId: searchParams.get("teamId") || undefined,
        search: searchParams.get("search") || undefined,
        page: searchParams.get("page") || undefined,
        perPage: searchParams.get("perPage") || undefined,
    });

    if (!parsedQuery.success) {
        return NextResponse.json({ success: false, message: "Filter users tidak valid" }, { status: 400 });
    }

    const {
        status = "ALL",
        role = "ALL",
        teamId = "ALL",
        search = "",
        page = 1,
        perPage = 20,
    } = parsedQuery.data;

    const normalizedStatus = status !== "ALL" ? (status as UserStatus) : undefined;
    const normalizedRole = role !== "ALL" ? (role as UserRole) : undefined;

    const where: Prisma.UserWhereInput = {
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
        ...(normalizedRole ? { role: normalizedRole } : {}),
        ...(teamId === "NO_TEAM"
            ? {
                  teamMemberships: {
                      none: { leftAt: null },
                  },
              }
            : teamId !== "ALL"
                ? {
                      teamMemberships: {
                          some: { teamId, leftAt: null },
                      },
                  }
                : {}),
        ...(search
            ? {
                  OR: [
                      { fullName: { contains: search } },
                      { email: { contains: search } },
                      { city: { contains: search } },
                      {
                          teamMemberships: {
                              some: {
                                  leftAt: null,
                                  team: { name: { contains: search } },
                              },
                          },
                      },
                  ],
              }
            : {}),
    };

    const [users, total, teams] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
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
                    },
                },
                ...activeTeamMembershipSelect,
            },
            orderBy: [{ role: "desc" }, { createdAt: "desc" }],
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.user.count({ where }),
        prisma.team.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
                _count: {
                    select: {
                        memberships: {
                            where: { leftAt: null },
                        },
                    },
                },
            },
            orderBy: { name: "asc" },
        }),
    ]);

    const mappedUsers = users.map((user) => {
        const { playerGameAccounts, ...userData } = user;
        const activeTeam = getActiveTeamSnapshot(user);
        const gameProfiles = (playerGameAccounts || []).map((account) => ({
            gameType: account.game.code,
            gameName: account.game.name,
            gameId: account.gamePlayerId,
            ign: account.ign,
        }));
        return {
            ...userData,
            gameProfiles,
            teamId: activeTeam.teamId,
            teamJoinedAt: activeTeam.teamJoinedAt,
            team: activeTeam.team,
        };
    });

    return NextResponse.json({
        success: true,
        data: mappedUsers,
        total,
        page,
        perPage,
        filters: {
            teams: teams.map((team) => ({
                id: team.id,
                name: team.name,
                slug: team.slug,
                isActive: team.isActive,
                memberCount: team._count.memberships,
            })),
        },
    });
}
