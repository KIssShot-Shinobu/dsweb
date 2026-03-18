import { TournamentRefereesClient } from "@/components/dashboard/tournament-referees-client";
import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TournamentRefereesPage({ params }: { params: Promise<{ id: string }> }) {
    await requireDashboardRole("OFFICER");
    const { id } = await params;
    return <TournamentRefereesClient tournamentId={id} />;
}
