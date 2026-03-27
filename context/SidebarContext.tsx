"use client";

import { createContext, useContext, useState } from "react";

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
    return (
        <SidebarContext.Provider
            value={{
                isOpen,
                isCollapsed,
                toggle: () => setIsOpen((v) => !v),
                toggleCollapsed: () => setIsCollapsed((v) => !v),
                close: () => setIsOpen(false),
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

export const useSidebar = () => useContext(SidebarContext);
