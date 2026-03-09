import type { UserRole, UserStatus } from "@prisma/client";

type OAuthUserRecord = {
    id: string;
    email: string;
    username: string;
    fullName: string;
    role: UserRole;
    status: UserStatus;
    teamId?: string | null;
    googleId?: string | null;
    avatarUrl?: string | null;
};

type OAuthPrismaLike = {
    user: {
        findUnique: (args: { where: Record<string, unknown>; select?: Record<string, boolean | Record<string, boolean>> }) => Promise<OAuthUserRecord | null>;
        create: (args: { data: Record<string, unknown> }) => Promise<OAuthUserRecord>;
        update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<OAuthUserRecord>;
    };
    emailVerificationToken?: {
        deleteMany: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    };
};

type SyncGoogleUserDeps = {
    prisma: OAuthPrismaLike;
    hashPassword: (password: string) => Promise<string>;
    generateSecureToken: (size?: number) => string;
    now?: () => Date;
};

type SyncGoogleUserInput = {
    googleId: string | null | undefined;
    email: string | null | undefined;
    name?: string | null;
    image?: string | null;
    emailVerified?: boolean;
};

type SyncGoogleUserResult =
    | { ok: true; outcome: "existing" | "linked" | "created"; user: OAuthUserRecord }
    | { ok: false; code: "PROFILE_INVALID" | "BANNED" | "GOOGLE_ACCOUNT_CONFLICT"; user?: OAuthUserRecord };

function sanitizeUsernameBase(value: string) {
    const cleaned = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, ".")
        .replace(/^[._-]+|[._-]+$/g, "")
        .replace(/\.{2,}/g, ".")
        .slice(0, 24);

    if (cleaned.length >= 3) {
        return cleaned;
    }

    return `user${Date.now().toString().slice(-6)}`;
}

async function ensureUniqueUsername(prisma: OAuthPrismaLike, baseCandidate: string) {
    const safeBase = sanitizeUsernameBase(baseCandidate);
    let candidate = safeBase;
    let attempt = 1;

    while (attempt <= 50) {
        const existing = await prisma.user.findUnique({ where: { username: candidate } });
        if (!existing) {
            return candidate;
        }

        const suffix = `${attempt}`;
        const maxBaseLength = Math.max(3, 24 - suffix.length - 1);
        candidate = `${safeBase.slice(0, maxBaseLength)}.${suffix}`;
        attempt += 1;
    }

    return `${safeBase.slice(0, 18)}.${Date.now().toString().slice(-5)}`;
}

export async function syncGoogleUser(
    deps: SyncGoogleUserDeps,
    input: SyncGoogleUserInput
): Promise<SyncGoogleUserResult> {
    const googleId = input.googleId?.trim();
    const normalizedEmail = input.email?.trim().toLowerCase();

    if (!googleId || !normalizedEmail) {
        return { ok: false, code: "PROFILE_INVALID" };
    }

    const userByGoogleId = await deps.prisma.user.findUnique({ where: { googleId } });
    if (userByGoogleId) {
        if (userByGoogleId.status === "BANNED") {
            return { ok: false, code: "BANNED", user: userByGoogleId };
        }

        if (input.emailVerified && deps.prisma.emailVerificationToken) {
            await deps.prisma.emailVerificationToken.deleteMany({ where: { userId: userByGoogleId.id } });
        }

        return { ok: true, outcome: "existing", user: userByGoogleId };
    }

    const userByEmail = await deps.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (userByEmail) {
        if (userByEmail.status === "BANNED") {
            return { ok: false, code: "BANNED", user: userByEmail };
        }

        if (userByEmail.googleId && userByEmail.googleId !== googleId) {
            return { ok: false, code: "GOOGLE_ACCOUNT_CONFLICT", user: userByEmail };
        }

        const updatedUser = await deps.prisma.user.update({
            where: { id: userByEmail.id },
            data: {
                googleId,
                emailVerifiedAt: input.emailVerified ? deps.now?.() ?? new Date() : undefined,
                avatarUrl: userByEmail.avatarUrl || input.image || undefined,
            },
        });

        if (input.emailVerified && deps.prisma.emailVerificationToken) {
            await deps.prisma.emailVerificationToken.deleteMany({ where: { userId: userByEmail.id } });
        }

        return { ok: true, outcome: "linked", user: updatedUser };
    }

    const username = await ensureUniqueUsername(
        deps.prisma,
        input.name || normalizedEmail.split("@")[0] || "user"
    );
    const hashedPassword = await deps.hashPassword(deps.generateSecureToken(32));

    const createdUser = await deps.prisma.user.create({
        data: {
            username,
            fullName: input.name?.trim() || username,
            email: normalizedEmail,
            password: hashedPassword,
            googleId,
            emailVerifiedAt: input.emailVerified ? deps.now?.() ?? new Date() : null,
            avatarUrl: input.image || null,
            status: "ACTIVE",
            role: "USER",
        },
    });

    if (input.emailVerified && deps.prisma.emailVerificationToken) {
        await deps.prisma.emailVerificationToken.deleteMany({ where: { userId: createdUser.id } });
    }

    return { ok: true, outcome: "created", user: createdUser };
}
