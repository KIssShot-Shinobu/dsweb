import { requireDashboardRole } from "@/lib/dashboard-auth";
import AdminGamesPage from "@/components/dashboard/admin-games-page";

export default async function GamesPage() {
    await requireDashboardRole("ADMIN");
    return <AdminGamesPage />;
}
