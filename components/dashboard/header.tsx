"use client";

import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "@/context/SidebarContext";
import { useCurrentUser } from "@/hooks/use-current-user";

function getInitials(name: string) {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "DS";
}

export function Header() {
    const { toggle } = useSidebar();
    const { user } = useCurrentUser();

    return (
        <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-black/5 bg-white/80 px-4 backdrop-blur dark:border-white/6 dark:bg-[#101014]/80 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <button
                    onClick={toggle}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-slate-500 transition-all hover:bg-slate-100 dark:text-white/50 dark:hover:bg-white/5 md:hidden"
                    aria-label="Open menu"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>

                <div className="hidden items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-2 text-slate-400 transition-colors focus-within:border-ds-amber dark:border-white/10 dark:bg-white/[0.04] sm:flex lg:w-72">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Cari halaman dashboard..."
                        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-white/70 dark:placeholder:text-white/30"
                    />
                </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
                <ThemeToggle />

                <button className="hidden h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white sm:flex" title="Notifications">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                </button>

                <div className="ml-1 flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-2 py-1.5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-ds-amber text-sm font-bold text-black">
                        {getInitials(user?.fullName ?? "Duel Standby")}
                    </div>
                    <div className="hidden min-w-0 lg:flex lg:flex-col">
                        <span className="truncate text-sm font-semibold leading-none text-slate-950 dark:text-white">
                            {user?.fullName ?? "Dashboard User"}
                        </span>
                        <span className="mt-1 truncate text-xs text-slate-400 dark:text-white/40">
                            {user?.email ?? "login required"}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
}
