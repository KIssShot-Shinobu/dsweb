import { TournamentOverviewClient } from "@/components/dashboard/tournament-overview-client";

export default async function TournamentAdminOverviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TournamentOverviewClient tournamentId={id} />;
}
