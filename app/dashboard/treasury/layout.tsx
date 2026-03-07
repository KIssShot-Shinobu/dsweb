import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TreasuryLayout({ children }: { children: React.ReactNode }) {
    await requireDashboardRole("ADMIN");
    return children;
}
