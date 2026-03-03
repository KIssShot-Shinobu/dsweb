"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

    return (
        <aside className="dashboard-sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">DS</div>
                <span className="sidebar-logo-text">DuelStandby</span>
            </div>

            <nav className="sidebar-menu">
                {menuItems.map((section) => (
                    <div key={section.section} className="sidebar-section">
                        <div className="sidebar-section-title">{section.section}</div>
                        {section.items.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                (item.href !== "/dashboard" && pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                                >
                                    <span className="sidebar-nav-icon">{item.icon}</span>
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="sidebar-section" style={{ marginTop: "auto", paddingBottom: "1rem" }}>
                <Link href="/" className="sidebar-nav-item">
                    <span className="sidebar-nav-icon">🏠</span>
                    <span>Back to Home</span>
                </Link>
            </div>
        </aside>
    );
}
