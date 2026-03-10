"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useHydrated } from "@/hooks/use-hydrated";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const hydrated = useHydrated();
    const isDark = hydrated ? theme === "dark" : true;

    return (
        <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-circle border border-base-300 bg-base-100/80"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
    );
}
