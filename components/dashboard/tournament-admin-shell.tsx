"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LayoutDashboard, ScrollText, Settings, Shield, Trophy, UserCheck, X, Gavel, Users } from "lucide-react";
import { btnOutline } from "@/components/dashboard/form-styles";
import { useLocale } from "@/hooks/use-locale";
import { formatDate } from "@/lib/i18n/format";

type TournamentShellProps = {
    tournamentId: string;
    canManage: boolean;
    canReferee: boolean;
    children: ReactNode;
};

const NAV_ITEMS = [
    { key: "overview", href: "", icon: LayoutDashboard },
    { key: "participants", href: "/participants", icon: UserCheck },
    { key: "bracket", href: "/bracket", icon: Trophy },
    { key: "matches", href: "/matches", icon: ScrollText },
    { key: "disputes", href: "/disputes", icon: Gavel, access: "referee" },
    { key: "checkIn", href: "/check-in", icon: Shield },
    { key: "announcements", href: "/announcements", icon: ScrollText },
    { key: "referees", href: "/referees", icon: Users, access: "manage" },
    { key: "settings", href: "/settings", icon: Settings },
    { key: "publish", href: "/publish", icon: Trophy },
] as const;

export function TournamentAdminShell({ tournamentId, canManage, canReferee, children }: TournamentShellProps) {
    const { locale, t } = useLocale();
    const pathname = usePathname();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [tournamentTitle, setTournamentTitle] = useState("");
    const [tournamentMeta, setTournamentMeta] = useState("");

    const navLinks = useMemo(() => {
        const links = NAV_ITEMS.filter((item) => {
            if (item.access === "manage") return canManage;
            if (item.access === "referee") return canManage || canReferee;
            return canManage;
        }).map((item) => ({
            ...item,
            label: t.dashboard.tournamentAdminShell.nav[item.key],
            href: `/dashboard/tournaments/${tournamentId}${item.href}`,
        }));

        return links;
    }, [canManage, canReferee, t, tournamentId]);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();

        const loadTournament = async () => {
            try {
                const res = await fetch(`/api/tournaments/${tournamentId}`, { signal: controller.signal });
                const data = await res.json();
                if (!active || !res.ok) return;
                setTournamentTitle(data.tournament?.title ?? "");
                setTournamentMeta(
                    `${data.tournament?.gameType ?? ""} ${t.dashboard.tournamentAdminShell.metaSeparator} ${formatDate(data.tournament?.startAt ?? Date.now(), locale)}`
                );
            } catch {
                if (active) {
                    setTournamentTitle("");
                    setTournamentMeta("");
                }
            }
        };

        loadTournament();
        return () => {
            active = false;
            controller.abort();
        };
    }, [tournamentId, locale]);

    return (
        <div className="drawer 2xl:drawer-open">
            <input
                id="tournament-admin-drawer"
                type="checkbox"
                className="drawer-toggle"
                checked={drawerOpen}
                onChange={(event) => setDrawerOpen(event.target.checked)}
            />
            <div className="drawer-content flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-base-200/40">
                <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100/95 px-4 py-4 shadow-sm backdrop-blur sm:px-5 lg:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <label htmlFor="tournament-admin-drawer" className={`${btnOutline} btn-sm 2xl:hidden`}>
                                {t.dashboard.tournamentAdminShell.menu}
                            </label>
                            <div className="space-y-1">
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">{t.dashboard.tournamentAdminShell.title}</div>
                                <div className="text-base font-bold text-base-content">{tournamentTitle || t.dashboard.tournamentAdminShell.loadingTitle}</div>
                                {tournamentMeta ? <div className="text-xs text-base-content/50">{tournamentMeta}</div> : null}
                            </div>
                        </div>
                        <Link href="/dashboard/tournaments" className={`${btnOutline} btn-sm`}>
                            {t.dashboard.tournamentAdminShell.backToList}
                        </Link>
                    </div>
                </header>
                <main className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-5 lg:p-6">{children}</main>
            </div>
            <div className="drawer-side z-50">
                <label htmlFor="tournament-admin-drawer" aria-label={t.common.close} className="drawer-overlay bg-black/40 2xl:hidden" />
                <aside className="min-h-full w-64 border-r border-base-300 bg-base-100/95 backdrop-blur 2xl:sticky 2xl:top-0 2xl:h-screen 2xl:overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/45">{t.dashboard.tournamentAdminShell.panelLabel}</div>
                            <div className="text-base font-black">{t.dashboard.tournamentAdminShell.panelTitle}</div>
                        </div>
                        <button className="btn btn-ghost btn-sm btn-circle 2xl:hidden" onClick={() => setDrawerOpen(false)}>
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <nav className="px-3 py-4">
                        <ul className="menu gap-2 rounded-box bg-base-200/40 p-2.5">
                            {navLinks.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                const Icon = item.icon;
                                return (
                                    <li key={item.href}>
                                        <Link href={item.href} className={isActive ? "active !bg-primary !text-primary-content" : ""} onClick={() => setDrawerOpen(false)}>
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
