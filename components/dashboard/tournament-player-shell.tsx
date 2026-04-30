"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { LayoutDashboard, MessageSquare, ScrollText, ShieldAlert, Sword, X } from "lucide-react";
import { btnOutline } from "@/components/dashboard/form-styles";
import { useLocale } from "@/hooks/use-locale";

type TournamentPlayerShellProps = {
    tournamentId: string;
    tournamentTitle: string;
    tournamentMeta?: string;
    children: ReactNode;
};

const NAV_ITEMS = [
    { key: "overview", href: "", icon: LayoutDashboard },
    { key: "yourMatch", href: "/your-match", icon: Sword },
    { key: "matchReport", href: "/match-report", icon: ScrollText },
    { key: "openDispute", href: "/open-dispute", icon: ShieldAlert },
    { key: "matchChat", href: "/match-chat", icon: MessageSquare },
] as const;

export function TournamentPlayerShell({ tournamentId, tournamentTitle, tournamentMeta, children }: TournamentPlayerShellProps) {
    const pathname = usePathname();
    const { t } = useLocale();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const navLinks = useMemo(
        () =>
            NAV_ITEMS.map((item) => ({
                ...item,
                label: t.dashboard.tournamentPlayerShell.nav[item.key],
                href: `/dashboard/my-tournaments/${tournamentId}${item.href}`,
            })),
        [t, tournamentId]
    );

    const bestMatch = navLinks
        .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    return (
        <div className="drawer 2xl:drawer-open">
            <input
                id="tournament-player-drawer"
                type="checkbox"
                className="drawer-toggle"
                checked={drawerOpen}
                onChange={(event) => setDrawerOpen(event.target.checked)}
            />
            <div className="drawer-content flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-base-200/40">
                <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100/95 px-4 py-4 shadow-sm backdrop-blur sm:px-5 lg:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <label htmlFor="tournament-player-drawer" className={`${btnOutline} btn-sm 2xl:hidden`}>
                                {t.dashboard.tournamentPlayerShell.menu}
                            </label>
                            <div className="space-y-1">
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
                                    {t.dashboard.tournamentPlayerShell.title}
                                </div>
                                <div className="text-base font-bold text-base-content">
                                    {tournamentTitle || t.dashboard.tournamentPlayerShell.loadingTitle}
                                </div>
                                {tournamentMeta ? <div className="text-xs text-base-content/50">{tournamentMeta}</div> : null}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link href={`/dashboard/my-tournaments/${tournamentId}/your-match`} className={`${btnOutline} btn-sm`}>
                                {t.dashboard.tournamentPlayerShell.quickYourMatch}
                            </Link>
                            <Link href="/dashboard/my-tournaments" className={`${btnOutline} btn-sm`}>
                                {t.dashboard.tournamentPlayerShell.backToList}
                            </Link>
                        </div>
                    </div>
                </header>
                <main className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-5 lg:p-6">{children}</main>
            </div>
            <div className="drawer-side z-50">
                <label htmlFor="tournament-player-drawer" aria-label={t.common.close} className="drawer-overlay bg-black/40 2xl:hidden" />
                <aside className="min-h-full w-64 border-r border-base-300 bg-base-100/95 backdrop-blur 2xl:sticky 2xl:top-0 2xl:h-screen 2xl:overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/45">
                                {t.dashboard.tournamentPlayerShell.panelLabel}
                            </div>
                            <div className="text-base font-black">{t.dashboard.tournamentPlayerShell.panelTitle}</div>
                        </div>
                        <button className="btn btn-ghost btn-sm btn-circle 2xl:hidden" onClick={() => setDrawerOpen(false)}>
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <nav className="px-3 py-4">
                        <ul className="menu gap-2 rounded-box bg-base-200/40 p-2.5">
                            {navLinks.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.href === bestMatch;

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={isActive ? "active !bg-primary !text-primary-content" : ""}
                                            onClick={() => setDrawerOpen(false)}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                </aside>
            </div>
        </div>
    );
}
