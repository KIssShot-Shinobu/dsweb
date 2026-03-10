"use client";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ToastProvider } from "@/components/dashboard/toast";
import { DashboardUserProvider } from "@/context/dashboard-user-context";
import { SidebarProvider } from "@/context/SidebarContext";

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <DashboardUserProvider>
                <ToastProvider>
                    <div className="drawer lg:drawer-open">
                        <input id="dashboard-drawer" type="checkbox" className="drawer-toggle" />
                        <div className="drawer-content min-h-screen bg-transparent">
                            <div className="flex min-h-screen flex-col">
                                <Header />
                                <main className="flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
                                    {children}
                                </main>
                            </div>
                        </div>
                        <Sidebar />
                    </div>
                </ToastProvider>
            </DashboardUserProvider>
        </SidebarProvider>
    );
}
