"use client";

import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "@/context/SidebarContext";

export function Header() {
    const { toggle } = useSidebar();

    return (
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#161616] flex-shrink-0 gap-3">
            {/* Left: hamburger + search */}
            <div className="flex items-center gap-3 min-w-0">
                {/* Hamburger — only on mobile */}
                <button
                    onClick={toggle}
                    className="md:hidden w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                    aria-label="Open menu"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>

                {/* Search — hidden on very small screens */}
                <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-400 w-52 lg:w-64 focus-within:border-ds-amber transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent text-sm text-gray-700 dark:text-white/70 outline-none placeholder:text-gray-400 dark:placeholder:text-white/30 w-full"
                    />
                </div>
            </div>

            {/* Right: actions + user */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <ThemeToggle />

                <button className="w-9 h-9 rounded-xl hidden sm:flex items-center justify-center text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-white transition-all" title="Notifications">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                </button>

                {/* User */}
                <div className="flex items-center gap-2 ml-1 pl-2 border-l border-gray-100 dark:border-white/10">
                    <div className="w-8 h-8 rounded-full bg-ds-amber flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                        A
                    </div>
                    <div className="hidden lg:flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white leading-none">Admin</span>
                        <span className="text-xs text-gray-400 dark:text-white/40 mt-0.5">admin@duelstandby.com</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
