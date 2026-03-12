"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, MoonStar, SunMedium, Swords, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useHydrated } from "@/hooks/use-hydrated";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { clientLogout } from "@/lib/client-auth";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const navLinks = [
    { name: "Beranda", href: "/" },
    { name: "Tentang", href: "/#about" },
    { name: "Turnamen", href: "/tournaments" },
    { name: "Team", href: "/teams" },
    { name: "Treasury", href: "/treasury" },
    { name: "Komunitas", href: "/#socials" },
];

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

    const themeButton = (
        <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-ghost btn-circle border border-base-300 bg-base-100/80"
            aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
            title={isDark ? "Mode terang" : "Mode gelap"}
        >
            {isDark ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
        </button>
    );

    const isAuthReady = hydrated && !checkingAuth;
    const showAuthSkeleton = !me && !isAuthReady;

    return (
        <nav className="navbar fixed left-0 right-0 top-0 z-50 border-b border-base-300 bg-base-100/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="badge badge-primary h-11 w-11 rounded-2xl border-0 text-center shadow-lg">
                            <Swords className="h-5 w-5" />
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
                    {themeButton}
                    {me ? <NotificationBell isLoggedIn /> : null}
                    {me ? (
                        <div className="dropdown dropdown-end" ref={menuRef}>
                            <button onClick={() => setMenuOpen((current) => !current)} className="btn btn-ghost btn-circle avatar" aria-label="Buka menu profil">
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
                                                {isAdmin ? "Dashboard" : "Profil Saya"}
                                            </Link>
                                        </li>
                                        {!me.emailVerified ? (
                                            <li>
                                                <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)} className="text-warning">
                                                    Verifikasi email
                                                </Link>
                                            </li>
                                        ) : null}
                                        <li>
                                            <button onClick={handleLogout} className="text-error">
                                                Keluar
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
                                Masuk
                            </Link>
                            <Link href="/register" className="btn btn-primary rounded-box">
                                Daftar
                            </Link>
                        </>
                    )}
                </div>

                <div className="md:hidden">
                    <button onClick={() => setIsOpen((current) => !current)} className="btn btn-ghost btn-circle">
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
                            <button onClick={toggleTheme} className="btn btn-outline w-full justify-between rounded-box">
                                <span>{theme === "dark" ? "Mode terang" : "Mode gelap"}</span>
                                {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                            </button>
                            {me ? (
                                <div className="grid grid-cols-1 gap-2 pt-1">
                                    <Link href={isAdmin ? "/dashboard" : "/dashboard/profile"} onClick={() => setIsOpen(false)} className="btn btn-ghost justify-start rounded-box">
                                        {isAdmin ? "Dashboard" : "Profil Saya"}
                                    </Link>
                                    {!me.emailVerified ? (
                                        <Link href="/dashboard/settings" onClick={() => setIsOpen(false)} className="btn btn-warning btn-outline rounded-box">
                                            Verifikasi email
                                        </Link>
                                    ) : null}
                                    <button onClick={handleLogout} className="btn btn-error btn-outline rounded-box">
                                        Keluar
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
                                        Masuk
                                    </Link>
                                    <Link href="/register" onClick={() => setIsOpen(false)} className="btn btn-primary rounded-box">
                                        Daftar
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
