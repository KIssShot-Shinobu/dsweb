"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";

const menuItems = [
    {
        section: "MENU",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: "📊" },
            { name: "Members", href: "/dashboard/members", icon: "👥" },
            { name: "Tournaments", href: "/dashboard/tournaments", icon: "🏆" },
            { name: "Treasury", href: "/dashboard/treasury", icon: "💰" },
        ],
    },
    {
        section: "GENERAL",
        items: [
            { name: "Settings", href: "/dashboard/settings", icon: "⚙️" },
            { name: "Help", href: "/dashboard/help", icon: "❓" },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isOpen, close } = useSidebar();

    return (
        <>
            {/* Mobile overlay backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={close}
                />
            )}

            {/* Sidebar panel */}
            <aside
                className={`
                    fixed top-0 left-0 h-full w-64 z-30
                    bg-[#161616] dark:bg-[#111]
                    flex flex-col border-r border-white/5
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                    md:translate-x-0
                `}
            >
                {/* Logo */}
                <div className="flex items-center justify-between px-5 h-16 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-ds-amber flex items-center justify-center text-black font-bold text-sm">
                            DS
                        </div>
                        <span className="text-white font-semibold text-base tracking-tight">DuelStandby</span>
                    </div>
                    {/* Close button (mobile only) */}
                    <button
                        onClick={close}
                        className="md:hidden w-8 h-8 flex items-center justify-center text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                        aria-label="Close menu"
                    >
                        ✕
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    {menuItems.map((section) => (
                        <div key={section.section} className="mb-4">
                            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-white/30 uppercase">
                                {section.section}
                            </div>
                            {section.items.map((item) => {
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={close}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 ${isActive
                                                ? "bg-ds-amber text-black"
                                                : "text-white/60 hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        <span className="text-base leading-none">{item.icon}</span>
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Back to Home */}
                <div className="px-3 pb-4 flex-shrink-0">
                    <Link
                        href="/"
                        onClick={close}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <span className="text-base leading-none">🏠</span>
                        <span>Back to Home</span>
                    </Link>
                </div>
            </aside>
        </>
    );
}
