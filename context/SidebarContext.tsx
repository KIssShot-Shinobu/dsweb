"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface SidebarContextValue {
    isOpen: boolean;
    isCollapsed: boolean;
    toggle: () => void;
    toggleCollapsed: () => void;
    close: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
    isOpen: false,
    isCollapsed: false,
    toggle: () => { },
    toggleCollapsed: () => { },
    close: () => { },
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const storageKey = "ds_sidebar_collapsed";

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = window.localStorage.getItem(storageKey);
        if (stored === "1") {
            setIsCollapsed(true);
            return;
        }
        if (stored === "0") {
            setIsCollapsed(false);
            return;
        }
        const shouldCollapse = window.innerWidth < 1280;
        setIsCollapsed(shouldCollapse);
        window.localStorage.setItem(storageKey, shouldCollapse ? "1" : "0");
    }, []);

    const setCollapsed = (value: boolean) => {
        setIsCollapsed(value);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(storageKey, value ? "1" : "0");
        }
    };

    return (
        <SidebarContext.Provider
            value={{
                isOpen,
                isCollapsed,
                toggle: () => setIsOpen((v) => !v),
                toggleCollapsed: () => setCollapsed(!isCollapsed),
                close: () => setIsOpen(false),
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

export const useSidebar = () => useContext(SidebarContext);
