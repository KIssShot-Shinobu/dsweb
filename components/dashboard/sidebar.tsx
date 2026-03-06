"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useEffect, useState } from "react";
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
    Users,
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
    members: Users,
    tournaments: Trophy,
    treasury: Wallet,
    dashboard: LayoutDashboard,
    users: UserCheck,
    admin: Shield,
    audit: ScrollText,
    logout: LogOut,
    home: Home,
} as const;

const ROLE_LEVEL: Record<string, number> = {
    USER: 0, MEMBER: 1, OFFICER: 2, ADMIN: 3, FOUNDER: 4,
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
            { name: "Members Guild", href: "/dashboard/members", icon: "members", minRole: "OFFICER" },
            { name: "Tournaments", href: "/dashboard/tournaments", icon: "tournaments", minRole: "ADMIN" },
            { name: "Treasury", href: "/dashboard/treasury", icon: "treasury", minRole: "ADMIN" },
        ],
    },
    {
        section: "ADMIN",
        minRole: "ADMIN",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: "dashboard", minRole: "ADMIN" },
            { name: "Registrasi User", href: "/dashboard/admin/users", icon: "users", minRole: "ADMIN" },
            { name: "Admin Panel", href: "/dashboard/admin", icon: "admin", minRole: "ADMIN" },
            { name: "Audit Logs", href: "/dashboard/audit-logs", icon: "audit", minRole: "ADMIN" },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isOpen, close } = useSidebar();
    const [userRole, setUserRole] = useState<string>("USER");
    const [userName, setUserName] = useState<string>("");
    const [userStatus, setUserStatus] = useState<string>("PENDING");

    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => {
                if (d.success && d.user) {
                    setUserRole(d.user.role);
                    setUserName(d.user.fullName);
                    setUserStatus(d.user.status);
                }
            })
            .catch(() => { });
    }, []);

    const canAccess = (minRole?: string) => {
        if (!minRole) return true;
        return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
    };

    const getInitials = (name: string) =>
        name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "DS";

    const statusColor = userStatus === "ACTIVE" ? "bg-emerald-500" : userStatus === "PENDING" ? "bg-yellow-500" : "bg-red-500";

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={close} />
            )}

            <aside className={`fixed top-0 left-0 h-full w-64 z-30 bg-white dark:bg-[#111] flex flex-col border-r border-gray-200 dark:border-white/5 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
                <div className="flex items-center justify-between px-5 h-16 border-b border-gray-200 dark:border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-ds-amber flex items-center justify-center text-black font-bold text-sm">DS</div>
                        <span className="text-gray-900 dark:text-white font-semibold text-base tracking-tight">DuelStandby</span>
                    </div>
                    <button
                        onClick={close}
                        className="md:hidden w-8 h-8 flex items-center justify-center text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {userName && (
                    <div className="px-3 py-3 border-b border-gray-200 dark:border-white/5">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-lg bg-ds-amber flex items-center justify-center text-black text-xs font-bold">{getInitials(userName)}</div>
                                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#161616] ${statusColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{userName}</div>
                                <div className="text-[10px] text-gray-500 dark:text-white/30 uppercase tracking-wider">{userRole}</div>
                            </div>
                        </div>
                    </div>
                )}

                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    {ALL_MENU.map((section) => {
                        if (section.minRole && !canAccess(section.minRole)) return null;
                        const visibleItems = section.items.filter((item) => canAccess(item.minRole));
                        if (visibleItems.length === 0) return null;

                        const bestMatch = ALL_MENU.flatMap(s => s.items)
                            .filter(i => pathname === i.href || pathname.startsWith(i.href + "/"))
                            .sort((a, b) => b.href.length - a.href.length)[0]?.href;

                        return (
                            <div key={section.section} className="mb-4">
                                <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-gray-500 dark:text-white/30 uppercase">{section.section}</div>
                                {visibleItems.map((item) => {
                                    const isActive = item.href === bestMatch || (item.href === "/dashboard" && pathname === "/dashboard");
                                    const ItemIcon = ICONS[item.icon];
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={close}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 ${isActive ? "bg-ds-amber text-black" : "text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"}`}
                                        >
                                            <ItemIcon className="w-4 h-4" />
                                            <span>{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>

                <div className="px-3 pb-4 flex-shrink-0 space-y-0.5 border-t border-gray-200 dark:border-white/5 pt-3">
                    <button
                        onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/5 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                    <Link href="/" onClick={close} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
                        <Home className="w-4 h-4" />
                        <span>Back to Home</span>
                    </Link>
                </div>
            </aside>
        </>
    );
}
