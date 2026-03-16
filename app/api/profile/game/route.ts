import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { updateGameProfileSchema } from "@/lib/validators";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { normalizeGameIdDigits } from "@/lib/game-id";
import { resolveGameByCodeOrId } from "@/lib/game";

// POST /api/profile/game - Create or Update Game Profile
export async function POST(request: NextRequest) {
    try {
        // SECURITY: Verify token strictly
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const userId = currentUser.id;
        const body = await request.json();
        const validBody = updateGameProfileSchema.safeParse(body);

        if (!validBody.success) {
            return NextResponse.json({ success: false, message: validBody.error.issues[0].message }, { status: 400 });
        }

        const { gameType, ign, gameId } = validBody.data;
        const game = await resolveGameByCodeOrId(prisma, gameType);
        if (!game) {
            return NextResponse.json({ success: false, message: "Game tidak ditemukan" }, { status: 400 });
        }

        // Cek apakah profile dengan gameType ini sudah ada untuk user tersebut
        const existingProfile = await prisma.playerGameAccount.findFirst({
            where: {
                userId,
                gameId: game.id,
            }
        });

        const gameIdCandidates = Array.from(new Set([gameId, normalizeGameIdDigits(gameId)].filter(Boolean)));

        const duplicateGameId = await prisma.playerGameAccount.findFirst({
            where: {
                gamePlayerId: { in: gameIdCandidates },
                gameId: game.id,
                NOT: existingProfile ? { id: existingProfile.id } : undefined,
            },
            select: { id: true },
        });

        if (duplicateGameId) {
            return NextResponse.json({ success: false, message: "Game ID sudah dipakai akun lain" }, { status: 409 });
        }

        let profile;
        if (existingProfile) {
            // Update
            profile = await prisma.playerGameAccount.update({
                where: { id: existingProfile.id },
                data: { ign, gamePlayerId: gameId }
            });
        } else {
            // Insert
            profile = await prisma.playerGameAccount.create({
                data: {
                    userId,
                    gameId: game.id,
                    gamePlayerId: gameId,
                    ign,
                }
            });
        }

        // AUDIT: Log Profile Updated
        await logAudit({
            userId,
            action: "GAME_PROFILE_UPDATED",
            targetId: profile.id,
            targetType: "PlayerGameAccount",
            details: { gameCode: game.code, ign, gameId, isNew: !existingProfile }
        });

        return NextResponse.json({ success: true, profile }, { status: 200 });

    } catch (error) {
        console.error("Error updating game profile:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}


