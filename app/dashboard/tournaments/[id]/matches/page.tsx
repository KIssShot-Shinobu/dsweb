import { TournamentMatchesClient } from "@/components/dashboard/tournament-matches-client";

export default async function TournamentMatchesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TournamentMatchesClient tournamentId={id} />;
}
