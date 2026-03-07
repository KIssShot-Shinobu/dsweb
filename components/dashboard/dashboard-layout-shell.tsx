"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { SidebarProvider } from "@/context/SidebarContext";
import { ToastProvider } from "@/components/dashboard/toast";
import { DashboardUserProvider } from "@/context/dashboard-user-context";

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <DashboardUserProvider>
                <ToastProvider>
                    <div className="flex h-screen overflow-hidden bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] dark:bg-[linear-gradient(180deg,_#09090b_0%,_#101014_100%)]">
                        <Sidebar />
                        <main className="flex min-w-0 flex-1 flex-col overflow-hidden md:ml-64">
                            <Header />
                            <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
                                {children}
                            </div>
                        </main>
                    </div>
                </ToastProvider>
            </DashboardUserProvider>
        </SidebarProvider>
    );
}
