import { requireDashboardRole } from "@/lib/dashboard-auth";
import DashboardHomeClient from "@/components/dashboard/dashboard-home-client";

export default async function DashboardPage() {
    await requireDashboardRole("ADMIN");
    return <DashboardHomeClient />;
}
