"use client";

import { Menu, Search } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "@/context/SidebarContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { NotificationBell } from "@/components/notifications/NotificationBell";

function getInitials(name: string) {
    return (
        name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "DS"
    );
}

export function Header() {
    const { toggle } = useSidebar();
    const { user } = useCurrentUser();
    const displayName = user?.username || user?.fullName || "Dashboard User";
    const avatarUrl = normalizeAssetUrl(user?.avatarUrl);

    return (
        <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/80 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <button onClick={toggle} className="btn btn-ghost btn-circle lg:hidden" aria-label="Open menu">
                        <Menu className="h-5 w-5" />
                    </button>

                    <label className="input input-bordered hidden w-full max-w-sm items-center gap-2 bg-base-100 sm:flex">
                        <Search className="h-4 w-4 text-base-content/45" />
                        <input type="text" className="grow" placeholder="Cari halaman dashboard..." />
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <div className="hidden sm:inline-flex">
                        <NotificationBell isLoggedIn={Boolean(user)} />
                    </div>

                    <div className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100/90 px-2 py-1.5 shadow-sm">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="h-10 w-10 rounded-2xl object-cover" />
                        ) : (
                            <div className="badge badge-primary h-10 w-10 rounded-2xl border-0 text-center text-sm font-black text-primary-content">
                                {getInitials(displayName)}
                            </div>
                        )}
                        <div className="hidden min-w-0 lg:block">
                            <div className="truncate text-sm font-semibold text-base-content">{displayName}</div>
                            <div className="truncate text-xs text-base-content/50">{user?.email ?? "login required"}</div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
