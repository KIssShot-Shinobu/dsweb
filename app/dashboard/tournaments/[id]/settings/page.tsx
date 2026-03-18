import { TournamentSettingsClient } from "@/components/dashboard/tournament-settings-client";
import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TournamentSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    await requireDashboardRole("OFFICER");
    const { id } = await params;
    return <TournamentSettingsClient tournamentId={id} />;
}
