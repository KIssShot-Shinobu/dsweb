import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function TournamentsLayout({ children }: { children: React.ReactNode }) {
    await requireDashboardRole("ADMIN");
    return children;
}
