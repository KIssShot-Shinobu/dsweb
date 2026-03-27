"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    HelpCircle,
    Home,
    Gamepad2,
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
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { clientLogout } from "@/lib/client-auth";
import { useLocale } from "@/hooks/use-locale";

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
    games: Gamepad2,
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

export function Sidebar() {
    const pathname = usePathname();
    const { isOpen, isCollapsed, close, toggleCollapsed } = useSidebar();
    const { user } = useCurrentUser();
    const { t } = useLocale();

    const userRole = user?.role ?? "USER";

    const canAccess = (minRole?: string) => {
        if (!minRole) return true;
        return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
    };

    const allMenu: MenuSection[] = [
        {
            section: t.dashboard.sidebar.sectionSelf,
            items: [
                { name: t.dashboard.sidebar.items.profile, href: "/dashboard/profile", icon: "profile" },
                { name: t.dashboard.sidebar.items.myTeam, href: "/dashboard/team", icon: "teams", minRole: "MEMBER" },
                { name: t.dashboard.sidebar.items.settings, href: "/dashboard/settings", icon: "settings" },
                { name: t.dashboard.sidebar.items.help, href: "/dashboard/help", icon: "help" },
            ],
        },
        {
            section: t.dashboard.sidebar.sectionGuild,
            minRole: "OFFICER",
            items: [
                { name: t.dashboard.sidebar.items.users, href: "/dashboard/users", icon: "users", minRole: "OFFICER" },
                { name: t.dashboard.sidebar.items.teams, href: "/dashboard/teams", icon: "teams", minRole: "OFFICER" },
                { name: t.dashboard.sidebar.items.tournaments, href: "/dashboard/tournaments", icon: "tournaments", minRole: "ADMIN" },
                { name: t.dashboard.sidebar.items.treasury, href: "/dashboard/treasury", icon: "treasury", minRole: "ADMIN" },
            ],
        },
        {
            section: t.dashboard.sidebar.sectionAdmin,
            minRole: "ADMIN",
            items: [
                { name: t.dashboard.sidebar.items.dashboard, href: "/dashboard", icon: "dashboard", minRole: "ADMIN" },
                { name: t.dashboard.sidebar.items.auditLogs, href: "/dashboard/audit-logs", icon: "audit", minRole: "ADMIN" },
                { name: t.dashboard.sidebar.items.games, href: "/dashboard/games", icon: "games", minRole: "ADMIN" },
            ],
        },
    ];

    const bestMatch = allMenu.flatMap((section) => section.items)
        .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    return (
        <div
            className={`drawer-side fixed inset-0 z-[70] lg:static lg:inset-auto ${isOpen ? "" : "pointer-events-none lg:pointer-events-auto"}`}
        >
            <label
                aria-label={t.common.close}
                className={`drawer-overlay bg-black/40 transition-opacity duration-200 lg:hidden ${isOpen ? "opacity-100" : "opacity-0"}`}
                onClick={close}
            />
            <aside
                className={`min-h-full w-80 bg-base-100 text-base-content shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:shadow-none ${isCollapsed ? "lg:w-20" : "lg:w-72"} ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
            >
                <div className="relative flex h-full flex-col border-r border-base-300 bg-base-100/95 backdrop-blur-xl lg:overflow-y-auto lg:overflow-x-visible">
                    <div className="flex h-16 items-center justify-between border-b border-base-300 px-5">
                        <div className={`flex items-center gap-3 ${isCollapsed ? "lg:justify-center lg:w-full" : ""}`}>
                            <div className="badge badge-primary h-10 w-10 rounded-2xl border-0 text-base font-black text-primary-content">DS</div>
                            <div className={isCollapsed ? "lg:hidden" : ""}>
                                <div className="text-sm font-black tracking-wide">{t.dashboard.sidebar.brandTitle}</div>
                                <div className="text-xs text-base-content/50">{t.dashboard.sidebar.brandSubtitle}</div>
                            </div>
                        </div>
                        <button onClick={close} className="btn btn-ghost btn-sm btn-circle lg:hidden" aria-label={t.common.close}>
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <nav className={`flex-1 overflow-y-auto overflow-x-visible px-3 py-4 ${isCollapsed ? "lg:px-2" : ""}`}>
                        {allMenu.map((section) => {
                            if (section.minRole && !canAccess(section.minRole)) return null;
                            const visibleItems = section.items.filter((item) => canAccess(item.minRole));
                            if (visibleItems.length === 0) return null;

                            return (
                                <div key={section.section} className="mb-5">
                                    <div className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.28em] text-base-content/45 ${isCollapsed ? "lg:hidden" : ""}`}>
                                        {section.section}
                                    </div>
                                    <ul className={`menu gap-2 rounded-box bg-base-200/40 p-2.5 overflow-visible ${isCollapsed ? "lg:p-2" : ""}`}>
                                        {visibleItems.map((item) => {
                                            const isActive = item.href === bestMatch || (item.href === "/dashboard" && pathname === "/dashboard");
                                            const ItemIcon = ICONS[item.icon];

                                            return (
                                                <li key={item.href}>
                                                    <Link
                                                        href={item.href}
                                                        onClick={close}
                                                        title={item.name}
                                                        aria-label={item.name}
                                                        className={`${isActive ? "active !bg-primary !text-primary-content" : ""} ${isCollapsed ? "lg:justify-center" : ""}`}
                                                    >
                                                        <ItemIcon className="h-4 w-4" />
                                                        <span className={isCollapsed ? "lg:hidden" : ""}>{item.name}</span>
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
                        <ul className={`menu gap-2 rounded-box bg-base-200/40 p-2.5 overflow-visible ${isCollapsed ? "lg:p-2" : ""}`}>
                            <li>
                                <button
                                    type="button"
                                    onClick={toggleCollapsed}
                                    aria-label={isCollapsed ? t.dashboard.header.expandSidebar : t.dashboard.header.collapseSidebar}
                                    title={isCollapsed ? t.dashboard.header.expandSidebar : t.dashboard.header.collapseSidebar}
                                    className={`btn btn-circle btn-sm mx-auto border border-base-300 bg-base-100 text-base-content ${isCollapsed ? "" : "lg:mx-0"}`}
                                >
                                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={async () => {
                                        await clientLogout("/login");
                                    }}
                                    title={t.dashboard.sidebar.footer.logout}
                                    aria-label={t.dashboard.sidebar.footer.logout}
                                    className={`${isCollapsed ? "lg:justify-center" : ""} text-error`}
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span className={isCollapsed ? "lg:hidden" : ""}>{t.dashboard.sidebar.footer.logout}</span>
                                </button>
                            </li>
                            <li>
                                <Link
                                    href="/"
                                    onClick={close}
                                    title={t.dashboard.sidebar.footer.backHome}
                                    aria-label={t.dashboard.sidebar.footer.backHome}
                                    className={isCollapsed ? "lg:justify-center" : ""}
                                >
                                    <Home className="h-4 w-4" />
                                    <span className={isCollapsed ? "lg:hidden" : ""}>{t.dashboard.sidebar.footer.backHome}</span>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </aside>
        </div>
    );
}
