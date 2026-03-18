import { redirect } from "next/navigation";
import { TournamentDisputesClient } from "@/components/dashboard/tournament-disputes-client";
import { requireDashboardUser } from "@/lib/dashboard-auth";
import { hasRole, ROLES } from "@/lib/auth";
import { canRefereeTournament } from "@/lib/tournament-staff";

export default async function TournamentDisputesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await requireDashboardUser();
    const canManage = hasRole(user.role, ROLES.OFFICER);
    const canReferee = canManage || await canRefereeTournament(user.id, id);

    if (!canReferee) {
        redirect("/dashboard/profile");
    }

    return <TournamentDisputesClient tournamentId={id} />;
}
