import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activeTeamMembershipSelect, getActiveTeamSnapshot } from "@/lib/team-membership";

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
    ...activeTeamMembershipSelect,
    createdAt: true,
    lastActiveAt: true,
    updatedAt: true,
    emailVerificationToken: {
        select: {
            id: true,
        },
    },
};

type CurrentUserRecord = Prisma.UserGetPayload<{ select: typeof currentUserSelect }>;

function mapCurrentUser(user: CurrentUserRecord) {
    const activeTeam = getActiveTeamSnapshot(user);

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
        teamId: activeTeam.teamId,
        teamJoinedAt: activeTeam.teamJoinedAt,
        team: activeTeam.team,
        teamMembershipRole: activeTeam.teamMembershipRole,
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
