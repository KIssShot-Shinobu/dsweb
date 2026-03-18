import { TournamentAnnouncementsClient } from "@/components/dashboard/tournament-announcements-client";
import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TournamentAnnouncementsPage({ params }: { params: Promise<{ id: string }> }) {
    await requireDashboardRole("OFFICER");
    const { id } = await params;
    return <TournamentAnnouncementsClient tournamentId={id} />;
}
