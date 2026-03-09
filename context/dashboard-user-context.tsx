"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { CurrentUser } from "@/hooks/use-current-user";

type DashboardUserContextValue = {
    user: CurrentUser | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
};

const DashboardUserContext = createContext<DashboardUserContextValue | undefined>(undefined);

export function DashboardUserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        setUser(data.success ? data.user ?? null : null);
    };

    useEffect(() => {
        let active = true;

        const loadUser = async () => {
            const response = await fetch("/api/auth/me");
            return response.json();
        };

        loadUser()
            .then((data) => {
                if (!active) return;
                setUser(data.success ? data.user ?? null : null);
            })
            .catch(() => {
                if (!active) return;
                setUser(null);
            })
            .finally(() => {
                if (!active) return;
                setLoading(false);
            });

        const handleRefresh = () => {
            loadUser()
                .then((data) => {
                    if (!active) return;
                    setUser(data.success ? data.user ?? null : null);
                })
                .catch(() => {
                    if (!active) return;
                    setUser(null);
                });
        };

        window.addEventListener("ds:user-updated", handleRefresh);

        return () => {
            active = false;
            window.removeEventListener("ds:user-updated", handleRefresh);
        };
    }, []);

    return (
        <DashboardUserContext.Provider value={{ user, loading, refreshUser }}>
            {children}
        </DashboardUserContext.Provider>
    );
}

export function useDashboardUserContext() {
    const context = useContext(DashboardUserContext);
    if (!context) {
        throw new Error("useDashboardUserContext must be used within DashboardUserProvider.");
    }
    return context;
}
