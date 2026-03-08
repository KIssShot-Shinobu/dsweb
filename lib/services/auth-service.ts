import type { RegisterInput, LoginInput } from "@/lib/validators";
import type { GameType, GuildStatus } from "@prisma/client";

type GameProfileLookup = { id: string } | null;
type VerificationTokenRecord = { id: string } | null;
type AuthUserRecord = {
    id: string;
    email: string;
    fullName: string;
    password?: string;
    status: string;
    role: string;
};

type RegisterConflictCode = "EMAIL_EXISTS" | "PHONE_EXISTS" | "GAME_ID_EXISTS";

type AuthPrismaLike = {
    user: {
        findUnique: (args: { where: Record<string, unknown>; select?: Record<string, boolean> }) => Promise<AuthUserRecord | null>;
        create?: (args: { data: Record<string, unknown> }) => Promise<AuthUserRecord>;
        update?: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<AuthUserRecord | null>;
    };
    gameProfile: {
        findFirst: (args: { where: Record<string, unknown> }) => Promise<GameProfileLookup>;
    };
    emailVerificationToken: {
        upsert: (args: { where: Record<string, unknown>; update: Record<string, unknown>; create: Record<string, unknown> }) => Promise<VerificationTokenRecord>;
    };
};

type AuthDeps = {
    prisma: AuthPrismaLike;
    hashPassword: (password: string) => Promise<string>;
    comparePassword: (password: string, hash: string) => Promise<boolean>;
    generateSecureToken: (size?: number) => string;
    now?: () => Date;
};

type RegisterUserOptions = {
    skipConflictCheck?: boolean;
};

async function findExistingGameProfile(prisma: AuthPrismaLike, data: RegisterInput) {
    const gameIdsToCheck: string[] = [];
    if (data.duelLinksGameId) gameIdsToCheck.push(data.duelLinksGameId);
    if (data.masterDuelGameId) gameIdsToCheck.push(data.masterDuelGameId);

    if (gameIdsToCheck.length === 0) {
        return null;
    }

    return prisma.gameProfile.findFirst({
        where: { gameId: { in: gameIdsToCheck } },
    });
}

export async function findRegisterConflict(
    deps: Pick<AuthDeps, "prisma">,
    data: RegisterInput
): Promise<RegisterConflictCode | null> {
    const [emailExists, phoneExists, existingGameProfile] = await Promise.all([
        deps.prisma.user.findUnique({ where: { email: data.email } }),
        data.phoneWhatsapp
            ? deps.prisma.user.findUnique({ where: { phoneWhatsapp: data.phoneWhatsapp } })
            : Promise.resolve(null),
        findExistingGameProfile(deps.prisma, data),
    ]);

    if (emailExists) {
        return "EMAIL_EXISTS";
    }

    if (phoneExists) {
        return "PHONE_EXISTS";
    }

    if (existingGameProfile) {
        return "GAME_ID_EXISTS";
    }

    return null;
}

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

    if (!user.password) {
        return { ok: false as const, code: "INVALID_CREDENTIALS", userId: user.id };
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
    data: RegisterInput,
    options: RegisterUserOptions = {}
) {
    if (!options.skipConflictCheck) {
        const conflictCode = await findRegisterConflict(deps, data);
        if (conflictCode) {
            return { ok: false as const, code: conflictCode };
        }
    }

    const hashedPassword = await deps.hashPassword(data.password);

    const createUser = deps.prisma.user.create;
    if (!createUser) {
        throw new Error("User repository create method is required");
    }

    const user = await createUser({
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
                            screenshotUrl: null,
                        }]
                        : []),
                    ...(data.masterDuelGameId && data.masterDuelIgn
                        ? [{
                            gameType: "MASTER_DUEL" as GameType,
                            gameId: data.masterDuelGameId,
                            ign: data.masterDuelIgn,
                            screenshotUrl: null,
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