import { TournamentCheckInClient } from "@/components/dashboard/tournament-checkin-client";

export default async function TournamentCheckInPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TournamentCheckInClient tournamentId={id} />;
}
