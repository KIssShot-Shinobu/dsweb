import { TournamentMatchesClient } from "@/components/dashboard/tournament-matches-client";
import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TournamentMatchesPage({ params }: { params: Promise<{ id: string }> }) {
    await requireDashboardRole("OFFICER");
    const { id } = await params;
    return <TournamentMatchesClient tournamentId={id} />;
}
