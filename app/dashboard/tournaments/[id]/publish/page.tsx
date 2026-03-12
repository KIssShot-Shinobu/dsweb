import { TournamentPublishClient } from "@/components/dashboard/tournament-publish-client";

export default async function TournamentPublishPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TournamentPublishClient tournamentId={id} />;
}
