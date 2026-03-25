"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useHydrated } from "@/hooks/use-hydrated";
import { useLocale } from "@/hooks/use-locale";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const hydrated = useHydrated();
    const { t } = useLocale();
    const isDark = hydrated ? theme === "dark" : true;

    return (
        <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-circle border border-base-300 bg-base-100/80"
            title={isDark ? t.dashboard.themeToggle.light : t.dashboard.themeToggle.dark}
        >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
    );
}
