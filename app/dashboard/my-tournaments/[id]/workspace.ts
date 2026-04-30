import { redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/dashboard-auth";
import { prisma } from "@/lib/prisma";
import { findTournamentParticipantForUser } from "@/lib/my-tournament-workspace";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";

export async function getTournamentWorkspaceOrRedirect(tournamentId: string) {
    const user = await requireDashboardUser();
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: {
            id: true,
            title: true,
            status: true,
            startAt: true,
            timezone: true,
            format: true,
            structure: true,
            entryFee: true,
            game: { select: { name: true, code: true } },
        },
    });

    if (!tournament) {
        redirect("/dashboard/my-tournaments");
    }

    const participant = await findTournamentParticipantForUser(tournamentId, { id: user.id, teamId: user.teamId });

    if (!participant) {
        redirect("/dashboard/my-tournaments");
    }

    return {
        user,
        tournament,
        participant,
        timezone: tournament.timezone ?? DEFAULT_TIMEZONE,
    };
}
