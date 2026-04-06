"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, MoonStar, SunMedium, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useHydrated } from "@/hooks/use-hydrated";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { clientLogout } from "@/lib/client-auth";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useLocale } from "@/hooks/use-locale";

type MeUser = {
    username: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
    emailVerified: boolean;
};

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [me, setMe] = useState<MeUser | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const { theme, toggleTheme } = useTheme();
    const { locale, setLocale, t } = useLocale();
    const hydrated = useHydrated();

    useEffect(() => {
        let active = true;

        const syncMe = async () => {
            if (active) setCheckingAuth(true);
            try {
                const response = await fetch("/api/auth/me");
                if (!response.ok) {
                    if (active) setMe(null);
                    return;
                }

                const data = await response.json();
                if (!active) return;

                if (data?.success && data.user) {
                    setMe({
                        username: data.user.username ?? data.user.fullName,
                        fullName: data.user.fullName,
                        avatarUrl: data.user.avatarUrl ?? null,
                        role: data.user.role ?? "USER",
                        emailVerified: Boolean(data.user.emailVerified),
                    });
                    return;
                }

                setMe(null);
            } catch {
                if (active) setMe(null);
            } finally {
                if (active) setCheckingAuth(false);
            }
        };

        syncMe();
        window.addEventListener("ds:user-updated", syncMe);
        return () => {
            active = false;
            window.removeEventListener("ds:user-updated", syncMe);
        };
    }, []);

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const initials = (name: string) =>
        name
            .split(/[\s._-]+/)
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

    const handleLogout = async () => {
        await clientLogout("/login");
        setMe(null);
    };

    const isAdmin = me ? ["ADMIN", "FOUNDER"].includes(me.role) : false;
    const avatarUrl = normalizeAssetUrl(me?.avatarUrl);
    const isDark = hydrated ? theme === "dark" : true;
    const navLinks = [
        { name: t.nav.home, href: "/" },
        { name: t.nav.about, href: "/#about" },
        { name: t.nav.tournaments, href: "/tournaments" },
        { name: t.nav.leaderboard, href: "/leaderboard" },
        { name: t.nav.teams, href: "/teams" },
        { name: t.nav.treasury, href: "/treasury" },
    ];

    const themeButton = (
        <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-ghost btn-circle border border-base-300 bg-base-100/80"
            aria-label={isDark ? t.nav.themeLight : t.nav.themeDark}
            title={isDark ? t.nav.themeLight : t.nav.themeDark}
        >
            {isDark ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
        </button>
    );

    const languageButton = (
        <button
            type="button"
            onClick={() => setLocale(locale === "id" ? "en" : "id")}
            className="btn btn-ghost rounded-box border border-base-300 bg-base-100/80 text-xs font-bold uppercase tracking-[0.2em]"
            aria-label={t.nav.language}
            title={t.nav.language}
        >
            {locale.toUpperCase()}
        </button>
    );

    const isAuthReady = hydrated && !checkingAuth;
    const showAuthSkeleton = !me && !isAuthReady;

    return (
        <nav className="navbar fixed left-0 right-0 top-0 z-50 border-b border-base-300 bg-base-100/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2" aria-label="Duel Standby">
                        <div className="badge badge-primary h-11 w-11 rounded-2xl border-0 p-0 text-center shadow-lg">
                            <Image
                                src="/logods.jpg"
                                alt="Duel Standby"
                                width={44}
                                height={44}
                                priority
                                className="h-full w-full rounded-2xl object-cover"
                            />
                        </div>
                        <span className="bg-gradient-to-r from-primary to-warning bg-clip-text text-lg font-black text-transparent sm:text-xl">
                            Duel Standby
                        </span>
                    </Link>
                </div>

                <div className="hidden items-center gap-2 md:flex">
                    <ul className="menu menu-horizontal rounded-box bg-base-200/60 p-1">
                        {navLinks.map((link) => (
                            <li key={link.name}>
                                <Link href={link.href}>{link.name}</Link>
                            </li>
                        ))}
                    </ul>
                    {languageButton}
                    {themeButton}
                    {me ? <NotificationBell isLoggedIn /> : null}
                    {me ? (
                        <div className="dropdown dropdown-end" ref={menuRef}>
                            <button onClick={() => setMenuOpen((current) => !current)} className="btn btn-ghost btn-circle avatar" aria-label={t.nav.profileMenu}>
                                <div className="w-10 rounded-full border border-base-300 bg-base-200">
                                    {avatarUrl ? (
                                        <Image
                                            unoptimized
                                            src={avatarUrl}
                                            alt={me.username}
                                            width={40}
                                            height={40}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-center bg-primary text-xs font-bold text-primary-content">
                                            {initials(me.username)}
                                        </div>
                                    )}
                                </div>
                            </button>
                            <AnimatePresence>
                                {menuOpen ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        className="menu dropdown-content z-[60] mt-3 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl"
                                    >
                                        <li>
                                            <Link href={isAdmin ? "/dashboard" : "/dashboard/profile"} onClick={() => setMenuOpen(false)}>
                                                {isAdmin ? t.nav.dashboard : t.nav.myProfile}
                                            </Link>
                                        </li>
                                        {!me.emailVerified ? (
                                            <li>
                                                <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)} className="text-warning">
                                                    {t.nav.verifyEmail}
                                                </Link>
                                            </li>
                                        ) : null}
                                        <li>
                                            <button onClick={handleLogout} className="text-error">
                                                {t.nav.logout}
                                            </button>
                                        </li>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>
                        </div>
                    ) : showAuthSkeleton ? (
                        <div className="flex items-center gap-2">
                            <div className="skeleton h-10 w-20 rounded-box" />
                            <div className="skeleton h-10 w-24 rounded-box" />
                        </div>
                    ) : (
                        <>
                            <Link href="/login" className="btn btn-outline rounded-box">
                                {t.nav.login}
                            </Link>
                            <Link href="/register" className="btn btn-primary rounded-box">
                                {t.nav.register}
                            </Link>
                        </>
                    )}
                </div>

                <div className="md:hidden">
                    <button onClick={() => setIsOpen((current) => !current)} className="btn btn-ghost btn-circle" aria-label={isOpen ? t.nav.closeMenu : t.nav.openMenu}>
                        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isOpen ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="absolute left-0 right-0 top-full border-b border-base-300 bg-base-100/95 px-3 py-3 backdrop-blur-xl md:hidden"
                    >
                        <div className="space-y-2">
                            {navLinks.map((link) => (
                                <Link key={link.name} href={link.href} onClick={() => setIsOpen(false)} className="btn btn-ghost w-full justify-start rounded-box">
                                    {link.name}
                                </Link>
                            ))}
                            <button onClick={() => setLocale(locale === "id" ? "en" : "id")} className="btn btn-outline w-full justify-between rounded-box">
                                <span>{t.nav.language}</span>
                                <span className="text-xs font-bold uppercase tracking-[0.2em]">{locale.toUpperCase()}</span>
                            </button>
                            <button onClick={toggleTheme} className="btn btn-outline w-full justify-between rounded-box">
                                <span>{theme === "dark" ? t.nav.themeLight : t.nav.themeDark}</span>
                                {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                            </button>
                            {me ? (
                                <div className="grid grid-cols-1 gap-2 pt-1">
                                    <Link href={isAdmin ? "/dashboard" : "/dashboard/profile"} onClick={() => setIsOpen(false)} className="btn btn-ghost justify-start rounded-box">
                                        {isAdmin ? t.nav.dashboard : t.nav.myProfile}
                                    </Link>
                                    {!me.emailVerified ? (
                                        <Link href="/dashboard/settings" onClick={() => setIsOpen(false)} className="btn btn-warning btn-outline rounded-box">
                                            {t.nav.verifyEmail}
                                        </Link>
                                    ) : null}
                                    <button onClick={handleLogout} className="btn btn-error btn-outline rounded-box">
                                        {t.nav.logout}
                                    </button>
                                </div>
                            ) : showAuthSkeleton ? (
                                <div className="grid grid-cols-1 gap-2 pt-1">
                                    <div className="skeleton h-10 w-full rounded-box" />
                                    <div className="skeleton h-10 w-full rounded-box" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 pt-1">
                                    <Link href="/login" onClick={() => setIsOpen(false)} className="btn btn-outline rounded-box">
                                        {t.nav.login}
                                    </Link>
                                    <Link href="/register" onClick={() => setIsOpen(false)} className="btn btn-primary rounded-box">
                                        {t.nav.register}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </nav>
    );
}
