import { requireDashboardRole } from "@/lib/dashboard-auth";

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
    await requireDashboardRole("OFFICER");
    return children;
}
