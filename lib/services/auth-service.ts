import type { RegisterInput, LoginInput } from "@/lib/validators";
import { activeTeamMembershipSelect, getActiveTeamSnapshot } from "@/lib/team-membership";

type VerificationTokenRecord = { id: string } | null;
type AuthUserRecord = {
    id: string;
    email: string;
    username: string;
    fullName: string;
    password?: string;
    status: string;
    role: string;
    teamId?: string | null;
    teamMemberships?: Array<{
        joinedAt: Date;
        role: string;
        team: {
            id: string;
            name: string;
            slug: string;
            isActive: boolean;
        };
    }>;
    emailVerifiedAt?: Date | null;
    authVersion?: number;
};

type RegisterConflictCode = "EMAIL_EXISTS";


type AuthPrismaLike = {
    user: {
        findUnique: (args: { where: Record<string, unknown>; select?: Record<string, unknown> }) => Promise<AuthUserRecord | null>;
        findFirst?: (args: { where: Record<string, unknown>; select?: Record<string, unknown> }) => Promise<AuthUserRecord | null>;
        create?: (args: { data: Record<string, unknown> }) => Promise<AuthUserRecord>;
        update?: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<AuthUserRecord | null>;
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

export async function findRegisterConflict(
    deps: Pick<AuthDeps, "prisma">,
    data: RegisterInput
): Promise<RegisterConflictCode | null> {
    const emailExists = await deps.prisma.user.findUnique({ where: { email: data.email } });
    if (emailExists) return "EMAIL_EXISTS";

    return null;
}

export async function authenticateUser(
    deps: Pick<AuthDeps, "prisma" | "comparePassword">,
    input: Pick<LoginInput, "identifier" | "password">
) {
    const identifier = input.identifier.trim().toLowerCase();
    const findUser = deps.prisma.user.findFirst;
    const user = findUser
        ? await findUser({
              where: {
                  OR: [{ email: identifier }, { username: identifier }],
              },
              select: {
                  id: true,
                  email: true,
                  username: true,
                  fullName: true,
                  password: true,
                  status: true,
                  role: true,
                  emailVerifiedAt: true,
                  authVersion: true,
                  ...activeTeamMembershipSelect,
              },
          })
        : await deps.prisma.user.findUnique({
              where: { email: identifier },
              select: {
                  id: true,
                  email: true,
                  username: true,
                  fullName: true,
                  password: true,
                  status: true,
                  role: true,
                  emailVerifiedAt: true,
                  authVersion: true,
                  ...activeTeamMembershipSelect,
              },
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

    const { teamId } = getActiveTeamSnapshot(user);

    return {
        ok: true as const,
        user: {
            ...user,
            teamId,
        },
    };
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
    const usernameBase = data.fullName?.trim() || data.email.split("@")[0] || "user";
    const username = await ensureUniqueUsername(
        deps.prisma,
        usernameBase
    );

    const createUser = deps.prisma.user.create;
    if (!createUser) {
        throw new Error("User repository create method is required");
    }

    const user = await createUser({
        data: {
            username,
            fullName: data.fullName.trim(),
            email: data.email,
            password: hashedPassword,
            status: "ACTIVE",
            role: "USER",
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

async function ensureUniqueUsername(prisma: AuthPrismaLike, baseCandidate: string) {
    const safeBase = sanitizeUsernameBase(baseCandidate);
    let candidate = safeBase;
    let attempt = 1;

    while (attempt <= 50) {
        const existing = await prisma.user.findUnique({ where: { username: candidate } });
        if (!existing) return candidate;

        const suffix = `${attempt}`;
        const maxBaseLength = Math.max(3, 24 - suffix.length - 1);
        candidate = `${safeBase.slice(0, maxBaseLength)}.${suffix}`;
        attempt += 1;
    }

    return `${safeBase.slice(0, 18)}.${Date.now().toString().slice(-5)}`;
}


