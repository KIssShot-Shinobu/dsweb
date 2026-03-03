import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import "./dashboard.css";

export const metadata = {
    title: "Dashboard | DuelStandby",
    description: "DuelStandby Guild Management Dashboard",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="dashboard-main">
                <Header />
                <div className="dashboard-content">{children}</div>
            </main>
        </div>
    );
}
