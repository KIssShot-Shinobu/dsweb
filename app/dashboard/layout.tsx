"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <SidebarProvider>
                <div className="flex h-screen bg-gray-50 dark:bg-[#0f0f0f] overflow-hidden">
                    <Sidebar />
                    {/* Main content: offset only on md+ */}
                    <main className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden min-w-0">
                        <Header />
                        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
                    </main>
                </div>
            </SidebarProvider>
        </ThemeProvider>
    );
}
