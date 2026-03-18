import { prisma } from "@/lib/prisma";

export async function canRefereeTournament(userId: string, tournamentId: string) {
    const staff = await prisma.tournamentStaff.findFirst({
        where: {
            userId,
            tournamentId,
            role: "REFEREE",
        },
        select: { id: true },
    });

    return Boolean(staff);
}

