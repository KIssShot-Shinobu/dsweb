import { DashboardLayoutShell } from "@/components/dashboard/dashboard-layout-shell";
import { requireDashboardUser } from "@/lib/dashboard-auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    await requireDashboardUser();
    return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
