import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { updateGameProfileSchema } from "@/lib/validators";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { normalizeGameIdDigits } from "@/lib/game-id";

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

        // Cek apakah profile dengan gameType ini sudah ada untuk user tersebut
        const existingProfile = await prisma.gameProfile.findFirst({
            where: {
                userId,
                gameType,
            }
        });

        const gameIdCandidates = Array.from(new Set([gameId, normalizeGameIdDigits(gameId)].filter(Boolean)));

        const duplicateGameId = await prisma.gameProfile.findFirst({
            where: {
                gameId: { in: gameIdCandidates },
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
            profile = await prisma.gameProfile.update({
                where: { id: existingProfile.id },
                data: { ign, gameId }
            });
        } else {
            // Insert
            profile = await prisma.gameProfile.create({
                data: {
                    userId,
                    gameType,
                    ign,
                    gameId
                }
            });
        }

        // AUDIT: Log Profile Updated
        await logAudit({
            userId,
            action: "GAME_PROFILE_UPDATED",
            targetId: profile.id,
            targetType: "GameProfile",
            details: { gameType, ign, gameId, isNew: !existingProfile }
        });

        return NextResponse.json({ success: true, profile }, { status: 200 });

    } catch (error) {
        console.error("Error updating game profile:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}


