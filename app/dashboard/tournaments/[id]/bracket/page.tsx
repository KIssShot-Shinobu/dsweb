import { TournamentBracketPage } from "@/components/dashboard/tournament-bracket-page";
import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TournamentBracketAdminPage({ params }: { params: Promise<{ id: string }> }) {
    await requireDashboardRole("OFFICER");
    const { id } = await params;
    return <TournamentBracketPage tournamentId={id} />;
}
