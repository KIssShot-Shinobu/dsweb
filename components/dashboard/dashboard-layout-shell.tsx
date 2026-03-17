"use client";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ToastProvider } from "@/components/dashboard/toast";
import { DashboardUserProvider } from "@/context/dashboard-user-context";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <DashboardUserProvider>
                <ToastProvider>
                    <DashboardLayoutContent>{children}</DashboardLayoutContent>
                </ToastProvider>
            </DashboardUserProvider>
        </SidebarProvider>
    );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { isOpen, toggle } = useSidebar();

    return (
        <div className="drawer lg:drawer-open h-screen">
            <input id="dashboard-drawer" type="checkbox" className="drawer-toggle" checked={isOpen} onChange={toggle} />
            <div className={`drawer-content h-screen overflow-hidden bg-transparent ${isOpen ? "overflow-hidden lg:overflow-hidden" : ""}`}>
                <div className="flex h-screen flex-col">
                    <Header />
                    <main className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
                        {children}
                    </main>
                </div>
            </div>
            <Sidebar />
        </div>
    );
}
