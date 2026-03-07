"use client";

import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "@/context/SidebarContext";
import { useCurrentUser } from "@/hooks/use-current-user";

function getInitials(name: string) {
    return name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "DS";
}

export function Header() {
    const { toggle } = useSidebar();
    const { user } = useCurrentUser();

    return (
        <header className="flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 dark:border-white/5 dark:bg-[#161616] md:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <button
                    onClick={toggle}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/5 md:hidden"
                    aria-label="Open menu"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>

                <div className="hidden w-52 items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-gray-400 transition-colors focus-within:border-ds-amber dark:border-white/10 dark:bg-white/5 sm:flex lg:w-64">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-white/70 dark:placeholder:text-white/30"
                    />
                </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1.5">
                <ThemeToggle />

                <button className="hidden h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white sm:flex" title="Notifications">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                </button>

                <div className="ml-1 flex items-center gap-2 border-l border-gray-100 pl-2 dark:border-white/10">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ds-amber text-sm font-bold text-black">
                        {getInitials(user?.fullName ?? "Duel Standby")}
                    </div>
                    <div className="hidden lg:flex flex-col">
                        <span className="text-sm font-semibold leading-none text-gray-900 dark:text-white">
                            {user?.fullName ?? "Dashboard User"}
                        </span>
                        <span className="mt-0.5 text-xs text-gray-400 dark:text-white/40">
                            {user?.email ?? "login required"}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
}
