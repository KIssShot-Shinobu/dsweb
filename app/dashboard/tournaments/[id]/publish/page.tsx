import { TournamentPublishClient } from "@/components/dashboard/tournament-publish-client";
import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TournamentPublishPage({ params }: { params: Promise<{ id: string }> }) {
    await requireDashboardRole("OFFICER");
    const { id } = await params;
    return <TournamentPublishClient tournamentId={id} />;
}
