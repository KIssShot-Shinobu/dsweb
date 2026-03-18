import { requireDashboardUser } from "@/lib/dashboard-auth";

export default async function TournamentsLayout({ children }: { children: React.ReactNode }) {
    await requireDashboardUser();
    return children;
}

