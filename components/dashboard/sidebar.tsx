"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
    HelpCircle,
    Home,
    LayoutDashboard,
    LogOut,
    ScrollText,
    Settings,
    Shield,
    Trophy,
    User,
    UserCheck,
    Wallet,
    X,
} from "lucide-react";

type MenuSection = {
    section: string;
    minRole?: string;
    items: { name: string; href: string; icon: keyof typeof ICONS; minRole?: string }[];
};

const ICONS = {
    profile: User,
    settings: Settings,
    help: HelpCircle,
    tournaments: Trophy,
    treasury: Wallet,
    dashboard: LayoutDashboard,
    users: UserCheck,
    teams: Shield,
    audit: ScrollText,
    logout: LogOut,
    home: Home,
} as const;

const ROLE_LEVEL: Record<string, number> = {
    USER: 0,
    MEMBER: 1,
    OFFICER: 2,
    ADMIN: 3,
    FOUNDER: 4,
};

const ALL_MENU: MenuSection[] = [
    {
        section: "SAYA",
        items: [
            { name: "Profil", href: "/dashboard/profile", icon: "profile" },
            { name: "Settings", href: "/dashboard/settings", icon: "settings" },
            { name: "Bantuan", href: "/dashboard/help", icon: "help" },
        ],
    },
    {
        section: "GUILD",
        minRole: "OFFICER",
        items: [
            { name: "Users", href: "/dashboard/users", icon: "users", minRole: "OFFICER" },
            { name: "Teams", href: "/dashboard/teams", icon: "teams", minRole: "OFFICER" },
            { name: "Tournaments", href: "/dashboard/tournaments", icon: "tournaments", minRole: "ADMIN" },
            { name: "Treasury", href: "/dashboard/treasury", icon: "treasury", minRole: "ADMIN" },
        ],
    },
    {
        section: "ADMIN",
        minRole: "ADMIN",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: "dashboard", minRole: "ADMIN" },
            { name: "Audit Logs", href: "/dashboard/audit-logs", icon: "audit", minRole: "ADMIN" },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isOpen, close } = useSidebar();
    const { user } = useCurrentUser();

    const userRole = user?.role ?? "USER";
    const userName = user?.fullName ?? "";
    const userStatus = user?.status ?? "ACTIVE";

    const canAccess = (minRole?: string) => {
        if (!minRole) return true;
        return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
    };

    const getInitials = (name: string) =>
        name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "DS";

    const statusColor = userStatus === "ACTIVE" ? "bg-emerald-500" : "bg-red-500";

    const bestMatch = ALL_MENU.flatMap((section) => section.items)
        .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    return (
        <>
            {isOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={close} />}

            <aside className={`fixed top-0 left-0 z-30 flex h-full w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out dark:border-white/5 dark:bg-[#111] ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
                <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 px-5 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ds-amber text-sm font-bold text-black">DS</div>
                        <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">DuelStandby</span>
                    </div>
                    <button
                        onClick={close}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white md:hidden"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {userName && (
                    <div className="border-b border-gray-200 px-3 py-3 dark:border-white/5">
                        <div className="flex items-center gap-3 rounded-xl bg-gray-100 px-3 py-2 dark:bg-white/5">
                            <div className="relative">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ds-amber text-xs font-bold text-black">
                                    {getInitials(userName)}
                                </div>
                                <div className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#161616] ${statusColor}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-semibold text-gray-900 dark:text-white">{userName}</div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/30">{userRole}</div>
                            </div>
                        </div>
                    </div>
                )}

                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    {ALL_MENU.map((section) => {
                        if (section.minRole && !canAccess(section.minRole)) return null;
                        const visibleItems = section.items.filter((item) => canAccess(item.minRole));
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={section.section} className="mb-4">
                                <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-white/30">
                                    {section.section}
                                </div>
                                {visibleItems.map((item) => {
                                    const isActive = item.href === bestMatch || (item.href === "/dashboard" && pathname === "/dashboard");
                                    const ItemIcon = ICONS[item.icon];

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={close}
                                            className={`mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isActive ? "bg-ds-amber text-black" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"}`}
                                        >
                                            <ItemIcon className="h-4 w-4" />
                                            <span>{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>

                <div className="flex-shrink-0 space-y-0.5 border-t border-gray-200 px-3 pt-3 pb-4 dark:border-white/5">
                    <button
                        onClick={async () => {
                            await fetch("/api/auth/logout", { method: "POST" });
                            window.location.href = "/login";
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-red-500/5 hover:text-red-500 dark:text-white/40 dark:hover:text-red-400"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                    </button>
                    <Link href="/" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white">
                        <Home className="h-4 w-4" />
                        <span>Back to Home</span>
                    </Link>
                </div>
            </aside>
        </>
    );
}
