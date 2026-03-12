import { TournamentBracketPage } from "@/components/dashboard/tournament-bracket-page";

export default async function TournamentBracketAdminPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TournamentBracketPage tournamentId={id} />;
}
