import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";

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
                                gameType: "DUEL_LINKS",
                                gameId: data.duelLinksGameId,
                                ign: data.duelLinksIgn,
                                screenshotUrl: data.duelLinksScreenshot || null,
                            }]
                            : []),
                        ...(data.masterDuelGameId && data.masterDuelIgn
                            ? [{
                                gameType: "MASTER_DUEL",
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
                        guildStatus: data.guildStatus,
                        socialMedia: JSON.stringify(data.socialMedia),
                        agreement: data.agreement,
                    },
                },
            },
        });

        await logAudit({ action: "USER_REGISTERED", userId: user.id, req });

        return NextResponse.json(
            { success: true, message: "Registrasi berhasil! Akun Anda sudah aktif dan bisa langsung login.", userId: user.id },
            { status: 201 }
        );
    } catch (error) {
        console.error("[Register API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
