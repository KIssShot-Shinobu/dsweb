"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LayoutDashboard, ScrollText, Settings, Shield, Trophy, UserCheck, X } from "lucide-react";
import { btnOutline } from "@/components/dashboard/form-styles";

type TournamentShellProps = {
    tournamentId: string;
    children: ReactNode;
};

const NAV_ITEMS = [
    { label: "Overview", href: "", icon: LayoutDashboard },
    { label: "Participants", href: "/participants", icon: UserCheck },
    { label: "Bracket", href: "/bracket", icon: Trophy },
    { label: "Matches", href: "/matches", icon: ScrollText },
    { label: "Check-In", href: "/check-in", icon: Shield },
    { label: "Announcements", href: "/announcements", icon: ScrollText },
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "Publish", href: "/publish", icon: Trophy },
] as const;

export function TournamentAdminShell({ tournamentId, children }: TournamentShellProps) {
    const pathname = usePathname();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [tournamentTitle, setTournamentTitle] = useState("");
    const [tournamentMeta, setTournamentMeta] = useState("");

    const navLinks = useMemo(
        () =>
            NAV_ITEMS.map((item) => ({
                ...item,
                href: `/dashboard/tournaments/${tournamentId}${item.href}`,
            })),
        [tournamentId]
    );

    useEffect(() => {
        let active = true;
        const controller = new AbortController();

        const loadTournament = async () => {
            try {
                const res = await fetch(`/api/tournaments/${tournamentId}`, { signal: controller.signal });
                const data = await res.json();
                if (!active || !res.ok) return;
                setTournamentTitle(data.tournament?.title ?? "");
                setTournamentMeta(`${data.tournament?.gameType ?? ""} · ${new Date(data.tournament?.startAt ?? Date.now()).toLocaleDateString("id-ID")}`);
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
    }, [tournamentId]);

    return (
        <div className="drawer lg:drawer-open">
            <input
                id="tournament-admin-drawer"
                type="checkbox"
                className="drawer-toggle"
                checked={drawerOpen}
                onChange={(event) => setDrawerOpen(event.target.checked)}
            />
            <div className="drawer-content flex min-h-screen flex-col bg-base-200/40">
                <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100/95 px-4 py-4 shadow-sm backdrop-blur sm:px-5 lg:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <label htmlFor="tournament-admin-drawer" className={`${btnOutline} btn-sm lg:hidden`}>
                                Menu
                            </label>
                            <div className="space-y-1">
                                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">Tournament Admin</div>
                                <div className="text-base font-bold text-base-content">{tournamentTitle || "Memuat turnamen..."}</div>
                                {tournamentMeta ? <div className="text-xs text-base-content/50">{tournamentMeta}</div> : null}
                            </div>
                        </div>
                        <Link href="/dashboard/tournaments" className={`${btnOutline} btn-sm`}>
                            Kembali ke daftar
                        </Link>
                    </div>
                </header>
                <main className="flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
            </div>
            <div className="drawer-side z-50">
                <label htmlFor="tournament-admin-drawer" aria-label="close sidebar" className="drawer-overlay bg-black/40 lg:hidden" />
                <aside className="min-h-full w-72 border-r border-base-300 bg-base-100/95 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/45">Panel</div>
                            <div className="text-base font-black">Kontrol Turnamen</div>
                        </div>
                        <button className="btn btn-ghost btn-sm btn-circle lg:hidden" onClick={() => setDrawerOpen(false)}>
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
