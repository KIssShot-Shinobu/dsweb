import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTokenFromCookie, verifyToken } from "@/lib/auth";

const currentUserSelect = {
    id: true,
    username: true,
    fullName: true,
    email: true,
    role: true,
    status: true,
    avatarUrl: true,
    city: true,
    phoneWhatsapp: true,
    teamId: true,
    teamJoinedAt: true,
    team: {
        select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
        },
    },
    createdAt: true,
    lastActiveAt: true,
    updatedAt: true,
    emailVerificationToken: {
        select: {
            id: true,
        },
    },
};

function mapCurrentUser(user: any) {
    return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        city: user.city,
        phoneWhatsapp: user.phoneWhatsapp,
        teamId: user.teamId,
        teamJoinedAt: user.teamJoinedAt,
        team: user.team,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt ?? user.updatedAt,
        emailVerified: !user.emailVerificationToken,
    };
}

async function findCurrentUserByEmail(email: string) {
    return prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: currentUserSelect,
    });
}

async function findCurrentUserById(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: currentUserSelect,
    });
}

export async function getServerCurrentUser() {
    const session = await auth();

    if (session?.user?.email) {
        const sessionUser = await findCurrentUserByEmail(session.user.email);
        if (sessionUser) {
            return mapCurrentUser(sessionUser);
        }
    }

    const token = await getTokenFromCookie();
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload?.userId) return null;

    const legacyUser = await findCurrentUserById(payload.userId);
    if (!legacyUser) return null;

    return mapCurrentUser(legacyUser);
}
