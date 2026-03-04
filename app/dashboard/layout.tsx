"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { ThemeProvider } from "@/context/ThemeContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider>
            <div className="flex h-screen bg-gray-50 dark:bg-[#0f0f0f]">
                <Sidebar />
                <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
                    <Header />
                    <div className="flex-1 overflow-y-auto p-6">{children}</div>
                </main>
            </div>
        </ThemeProvider>
    );
}
