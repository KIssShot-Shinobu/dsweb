import { TournamentParticipantsClient } from "@/components/dashboard/tournament-participants-client";
import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TournamentParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
    await requireDashboardRole("OFFICER");
    const { id } = await params;
    return <TournamentParticipantsClient tournamentId={id} />;
}
