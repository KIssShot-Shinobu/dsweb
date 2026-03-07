"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { CurrentUser } from "@/hooks/use-current-user";

type DashboardUserContextValue = {
    user: CurrentUser | null;
    loading: boolean;
};

const DashboardUserContext = createContext<DashboardUserContextValue | undefined>(undefined);

export function DashboardUserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        fetch("/api/auth/me")
            .then((response) => response.json())
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

        return () => {
            active = false;
        };
    }, []);

    return (
        <DashboardUserContext.Provider value={{ user, loading }}>
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
