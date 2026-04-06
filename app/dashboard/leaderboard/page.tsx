import { requireDashboardRole } from "@/lib/dashboard-auth";
import LeaderboardAdminPage from "@/components/dashboard/leaderboard-admin-page";

export default async function DashboardLeaderboardPage() {
    await requireDashboardRole("ADMIN");
    return <LeaderboardAdminPage />;
}
