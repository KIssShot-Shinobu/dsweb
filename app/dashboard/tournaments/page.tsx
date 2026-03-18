import { requireDashboardRole } from "@/lib/dashboard-auth";
import AdminTournamentsPage from "@/components/dashboard/admin-tournaments-page";

export default async function AdminTournamentsRoute() {
    await requireDashboardRole("ADMIN");
    return <AdminTournamentsPage />;
}
