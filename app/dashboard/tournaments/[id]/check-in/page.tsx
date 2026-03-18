import { TournamentCheckInClient } from "@/components/dashboard/tournament-checkin-client";
import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TournamentCheckInPage({ params }: { params: Promise<{ id: string }> }) {
    await requireDashboardRole("OFFICER");
    const { id } = await params;
    return <TournamentCheckInClient tournamentId={id} />;
}
