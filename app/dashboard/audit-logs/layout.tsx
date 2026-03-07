import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function AuditLogsLayout({ children }: { children: React.ReactNode }) {
    await requireDashboardRole("ADMIN");
    return children;
}
