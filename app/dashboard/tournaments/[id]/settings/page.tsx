import { TournamentSettingsClient } from "@/components/dashboard/tournament-settings-client";

export default async function TournamentSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TournamentSettingsClient tournamentId={id} />;
}
