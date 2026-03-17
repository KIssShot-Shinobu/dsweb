import { TournamentParticipantsClient } from "@/components/dashboard/tournament-participants-client";
import prisma from "@/lib/prisma";

export default async function TournamentParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
        where: { id },
        select: { isTeamTournament: true, mode: true, entryFee: true },
    });
    const isTeamTournament = Boolean(tournament?.isTeamTournament || (tournament?.mode && tournament.mode !== "INDIVIDUAL"));
    return <TournamentParticipantsClient tournamentId={id} isTeamTournament={isTeamTournament} entryFee={tournament?.entryFee ?? 0} />;
}
