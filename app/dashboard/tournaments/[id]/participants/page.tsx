import { TournamentParticipantsClient } from "@/components/dashboard/tournament-participants-client";

export default async function TournamentParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TournamentParticipantsClient tournamentId={id} />;
}
