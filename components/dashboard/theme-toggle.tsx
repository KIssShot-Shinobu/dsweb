"use client";

import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200
                border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700
                dark:border-gray-700 dark:bg-ds-charcoal dark:text-gray-400 dark:hover:bg-ds-charcoal-light dark:hover:text-ds-gold"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {theme === "dark" ? (
                <Sun className="w-5 h-5" />
            ) : (
                <Moon className="w-5 h-5" />
            )}
        </button>
    );
}
