"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useSidebar } from "@/context/SidebarContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { clientLogout } from "@/lib/client-auth";

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
            { name: "Team Saya", href: "/dashboard/team", icon: "teams", minRole: "MEMBER" },
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

    const canAccess = (minRole?: string) => {
        if (!minRole) return true;
        return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
    };

    const bestMatch = ALL_MENU.flatMap((section) => section.items)
        .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    return (
        <div className={`drawer-side z-40 ${isOpen ? "" : "pointer-events-none lg:pointer-events-auto"}`}>
            <label aria-label="close sidebar" className="drawer-overlay" onClick={close} />
            <aside className={`min-h-full w-80 bg-base-100 text-base-content transition-transform duration-300 lg:w-72 ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
                <div className="flex h-full flex-col border-r border-base-300 bg-base-100/95 backdrop-blur-xl">
                    <div className="flex h-16 items-center justify-between border-b border-base-300 px-5">
                        <div className="flex items-center gap-3">
                            <div className="badge badge-primary h-10 w-10 rounded-2xl border-0 text-base font-black text-primary-content">DS</div>
                            <div>
                                <div className="text-sm font-black tracking-wide">Duel Standby</div>
                                <div className="text-xs text-base-content/50">Dashboard</div>
                            </div>
                        </div>
                        <button onClick={close} className="btn btn-ghost btn-sm btn-circle lg:hidden" aria-label="Close">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-3 py-4">
                        {ALL_MENU.map((section) => {
                            if (section.minRole && !canAccess(section.minRole)) return null;
                            const visibleItems = section.items.filter((item) => canAccess(item.minRole));
                            if (visibleItems.length === 0) return null;

                            return (
                                <div key={section.section} className="mb-5">
                                    <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.28em] text-base-content/45">
                                        {section.section}
                                    </div>
                                    <ul className="menu gap-1 rounded-box bg-base-200/40 p-2">
                                        {visibleItems.map((item) => {
                                            const isActive = item.href === bestMatch || (item.href === "/dashboard" && pathname === "/dashboard");
                                            const ItemIcon = ICONS[item.icon];

                                            return (
                                                <li key={item.href}>
                                                    <Link
                                                        href={item.href}
                                                        onClick={close}
                                                        className={isActive ? "active !bg-primary !text-primary-content" : ""}
                                                    >
                                                        <ItemIcon className="h-4 w-4" />
                                                        <span>{item.name}</span>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            );
                        })}
                    </nav>

                    <div className="border-t border-base-300 px-3 py-4">
                        <ul className="menu rounded-box bg-base-200/40 p-2">
                            <li>
                                <button
                                    onClick={async () => {
                                        await clientLogout("/login");
                                    }}
                                    className="text-error"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Logout</span>
                                </button>
                            </li>
                            <li>
                                <Link href="/" onClick={close}>
                                    <Home className="h-4 w-4" />
                                    <span>Back to Home</span>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </aside>
        </div>
    );
}
