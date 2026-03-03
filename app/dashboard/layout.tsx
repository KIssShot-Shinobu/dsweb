"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { ThemeProvider } from "@/context/ThemeContext";
import "./dashboard.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider>
            <div className="dashboard-layout">
                <Sidebar />
                <main className="dashboard-main">
                    <Header />
                    <div className="dashboard-content">{children}</div>
                </main>
            </div>
        </ThemeProvider>
    );
}
