import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GameType, GuildStatus } from "@prisma/client";
import { registerSchema } from "@/lib/validators";
import { generateSecureToken, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const data = parsed.data;

        // ── Check duplicates ─────────────────────────────────────────────────
        const [emailExists, phoneExists] = await Promise.all([
            prisma.user.findUnique({ where: { email: data.email } }),
            data.phoneWhatsapp
                ? prisma.user.findUnique({ where: { phoneWhatsapp: data.phoneWhatsapp } })
                : null,
        ]);

        if (emailExists) {
            return NextResponse.json(
                { success: false, message: "Email sudah terdaftar", errors: { email: ["Email sudah digunakan"] } },
                { status: 409 }
            );
        }
        if (phoneExists) {
            return NextResponse.json(
                { success: false, message: "Nomor WhatsApp sudah terdaftar", errors: { phoneWhatsapp: ["Nomor sudah digunakan"] } },
                { status: 409 }
            );
        }

        // Check game ID duplicates
        const gameIdsToCheck: string[] = [];
        if (data.duelLinksGameId) gameIdsToCheck.push(data.duelLinksGameId);
        if (data.masterDuelGameId) gameIdsToCheck.push(data.masterDuelGameId);

        if (gameIdsToCheck.length > 0) {
            const existingGameProfile = await prisma.gameProfile.findFirst({
                where: { gameId: { in: gameIdsToCheck } },
            });
            if (existingGameProfile) {
                return NextResponse.json(
                    { success: false, message: "ID Game sudah terdaftar", errors: { duelLinksGameId: ["ID Game sudah digunakan"] } },
                    { status: 409 }
                );
            }
        }

        // ── Create user + game profiles + registration log ───────────────────
        const hashedPassword = await hashPassword(data.password);

        const user = await prisma.user.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                password: hashedPassword,
                phoneWhatsapp: data.phoneWhatsapp,
                city: data.city,
                status: "ACTIVE",
                role: "USER",
                gameProfiles: {
                    create: [
                        ...(data.duelLinksGameId && data.duelLinksIgn
                            ? [{
                                gameType: GameType.DUEL_LINKS,
                                gameId: data.duelLinksGameId,
                                ign: data.duelLinksIgn,
                                screenshotUrl: data.duelLinksScreenshot || null,
                            }]
                            : []),
                        ...(data.masterDuelGameId && data.masterDuelIgn
                            ? [{
                                gameType: GameType.MASTER_DUEL,
                                gameId: data.masterDuelGameId,
                                ign: data.masterDuelIgn,
                                screenshotUrl: data.masterDuelScreenshot || null,
                            }]
                            : []),
                    ],
                },
                registrationLog: {
                    create: {
                        sourceInfo: data.sourceInfo,
                        prevGuild: data.prevGuild || null,
                        guildStatus: data.guildStatus as GuildStatus,
                        socialMedia: JSON.stringify(data.socialMedia),
                        agreement: data.agreement,
                    },
                },
            },
        });

        const verifyToken = generateSecureToken(48);
        const verifyExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

        try {
            await prisma.emailVerificationToken.upsert({
                where: { userId: user.id },
                update: {
                    token: verifyToken,
                    expiresAt: verifyExpiresAt,
                },
                create: {
                    userId: user.id,
                    token: verifyToken,
                    expiresAt: verifyExpiresAt,
                },
            });
        } catch (verifyTokenError) {
            // Graceful fallback while DB migration is being applied.
            console.error("[Register API][EmailVerificationToken]", verifyTokenError);
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;
        try {
            await sendEmail({
                to: user.email,
                subject: "Verifikasi Email DuelStandby",
                text: `Halo ${user.fullName},\n\nVerifikasi email akun Anda di link berikut:\n${verifyUrl}\n\nJika Anda tidak merasa mendaftar, abaikan email ini.`,
                debugTag: "Auth][VerifyEmail",
            });
        } catch (emailError) {
            // Do not fail registration if email transport is unavailable.
            console.error("[Register API][Email]", emailError);
        }

        await logAudit({ action: "USER_REGISTERED", userId: user.id });

        return NextResponse.json(
            {
                success: true,
                message: "Registrasi berhasil! Akun Anda sudah aktif dan bisa langsung login.",
                userId: user.id,
                ...(process.env.NODE_ENV !== "production" ? { debugVerifyUrl: verifyUrl } : {}),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[Register API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

