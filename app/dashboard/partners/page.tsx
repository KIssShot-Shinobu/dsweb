import { requireDashboardRole } from "@/lib/dashboard-auth";
import AdminPartnersPage from "@/components/dashboard/admin-partners-page";

export default async function PartnersPage() {
    await requireDashboardRole("ADMIN");
    return <AdminPartnersPage />;
}
