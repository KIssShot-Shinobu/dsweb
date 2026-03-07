import type { RegisterInput, LoginInput } from "@/lib/validators";
import type { GameType, GuildStatus } from "@prisma/client";

type AuthPrismaLike = {
    user: {
        findUnique: (args: any) => Promise<any>;
        create: (args: any) => Promise<any>;
        update: (args: any) => Promise<any>;
    };
    gameProfile: {
        findFirst: (args: any) => Promise<any>;
    };
    emailVerificationToken: {
        upsert: (args: any) => Promise<any>;
    };
};

type AuthDeps = {
    prisma: AuthPrismaLike;
    hashPassword: (password: string) => Promise<string>;
    comparePassword: (password: string, hash: string) => Promise<boolean>;
    generateSecureToken: (size?: number) => string;
    now?: () => Date;
};

export async function authenticateUser(
    deps: Pick<AuthDeps, "prisma" | "comparePassword">,
    input: Pick<LoginInput, "email" | "password">
) {
    const user = await deps.prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, fullName: true, password: true, status: true, role: true },
    });

    if (!user) {
        return { ok: false as const, code: "INVALID_CREDENTIALS" };
    }

    const isValid = await deps.comparePassword(input.password, user.password);
    if (!isValid) {
        return { ok: false as const, code: "INVALID_CREDENTIALS", userId: user.id };
    }

    const isAdmin = ["ADMIN", "FOUNDER"].includes(user.role);
    if (!isAdmin && user.status !== "ACTIVE") {
        return { ok: false as const, code: user.status, userId: user.id };
    }

    return { ok: true as const, user };
}

export async function registerUser(
    deps: AuthDeps,
    data: RegisterInput
) {
    const [emailExists, phoneExists] = await Promise.all([
        deps.prisma.user.findUnique({ where: { email: data.email } }),
        data.phoneWhatsapp
            ? deps.prisma.user.findUnique({ where: { phoneWhatsapp: data.phoneWhatsapp } })
            : null,
    ]);

    if (emailExists) {
        return { ok: false as const, code: "EMAIL_EXISTS" };
    }

    if (phoneExists) {
        return { ok: false as const, code: "PHONE_EXISTS" };
    }

    const gameIdsToCheck: string[] = [];
    if (data.duelLinksGameId) gameIdsToCheck.push(data.duelLinksGameId);
    if (data.masterDuelGameId) gameIdsToCheck.push(data.masterDuelGameId);

    if (gameIdsToCheck.length > 0) {
        const existingGameProfile = await deps.prisma.gameProfile.findFirst({
            where: { gameId: { in: gameIdsToCheck } },
        });

        if (existingGameProfile) {
            return { ok: false as const, code: "GAME_ID_EXISTS" };
        }
    }

    const hashedPassword = await deps.hashPassword(data.password);

    const user = await deps.prisma.user.create({
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
                            gameType: "DUEL_LINKS" as GameType,
                            gameId: data.duelLinksGameId,
                            ign: data.duelLinksIgn,
                            screenshotUrl: data.duelLinksScreenshot || null,
                        }]
                        : []),
                    ...(data.masterDuelGameId && data.masterDuelIgn
                        ? [{
                            gameType: "MASTER_DUEL" as GameType,
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

    const now = deps.now?.() ?? new Date();
    const verifyToken = deps.generateSecureToken(48);
    const verifyExpiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24);

    await deps.prisma.emailVerificationToken.upsert({
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

    return { ok: true as const, user, verifyToken };
}
