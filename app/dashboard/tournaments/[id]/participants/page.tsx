import { TournamentParticipantsClient } from "@/components/dashboard/tournament-participants-client";
import { requireDashboardRole } from "@/lib/dashboard-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function TournamentParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
    await requireDashboardRole("OFFICER");
    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
        where: { id },
        select: { status: true, isTeamTournament: true, mode: true, entryFee: true },
    });
    if (!tournament) {
        notFound();
    }
    const isTeamTournament = tournament.isTeamTournament || tournament.mode !== "INDIVIDUAL";
    return (
        <TournamentParticipantsClient
            tournamentId={id}
            tournamentStatus={tournament.status}
            isTeamTournament={isTeamTournament}
            entryFee={tournament.entryFee ?? 0}
        />
    );
}
