import { TournamentOverviewClient } from "@/components/dashboard/tournament-overview-client";
import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TournamentAdminOverviewPage({ params }: { params: Promise<{ id: string }> }) {
    await requireDashboardRole("OFFICER");
    const { id } = await params;
    return <TournamentOverviewClient tournamentId={id} />;
}
