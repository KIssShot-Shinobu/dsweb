import { requireDashboardRole } from "@/lib/dashboard-auth";
import TournamentCreateClient from "@/components/dashboard/tournament-create-client";

export default async function TournamentCreateRoute() {
    await requireDashboardRole("ADMIN");
    return <TournamentCreateClient />;
}
