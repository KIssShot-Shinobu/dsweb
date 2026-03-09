import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const currentUserSelect = {
    id: true,
    username: true,
    fullName: true,
    email: true,
    role: true,
    status: true,
    avatarUrl: true,
    provinceCode: true,
    provinceName: true,
    cityCode: true,
    city: true,
    phoneWhatsapp: true,
    authVersion: true,
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
        provinceCode: user.provinceCode,
        provinceName: user.provinceName,
        cityCode: user.cityCode,
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
    const sessionAuthVersion =
        session?.user && "authVersion" in session.user && typeof session.user.authVersion === "number"
            ? session.user.authVersion
            : null;

    if (session?.user?.id) {
        const sessionUser = await findCurrentUserById(session.user.id);
        if (sessionUser && sessionAuthVersion === sessionUser.authVersion) {
            return mapCurrentUser(sessionUser);
        }
    }

    if (session?.user?.email) {
        const sessionUser = await findCurrentUserByEmail(session.user.email);
        if (sessionUser && sessionAuthVersion === sessionUser.authVersion) {
            return mapCurrentUser(sessionUser);
        }
    }

    return null;
}
