"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Swords, MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { clientLogout } from "@/lib/client-auth";

const navLinks = [
    { name: "Beranda", href: "/" },
    { name: "Tentang", href: "/#about" },
    { name: "Turnamen", href: "/tournaments" },
    { name: "Komunitas", href: "/#socials" },
];

type MeUser = { username: string; fullName: string; avatarUrl: string | null; role: string; emailVerified: boolean; };

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [me, setMe] = useState<MeUser | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        let active = true;

        const loadMe = async () => {
            const response = await fetch("/api/auth/me");
            if (!response.ok) {
                return null;
            }

            return response.json();
        };

        const syncMe = () => {
            loadMe()
                .then((data) => {
                    if (!active) return;
                    if (data?.success && data.user) {
                        setMe({
                            username: data.user.username ?? data.user.fullName,
                            fullName: data.user.fullName,
                            avatarUrl: data.user.avatarUrl ?? null,
                            role: data.user.role ?? "USER",
                            emailVerified: Boolean(data.user.emailVerified),
                        });
                    } else {
                        setMe(null);
                    }
                })
                .catch(() => {
                    if (!active) return;
                    setMe(null);
                });
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
            if (!menuRef.current) return;
            if (!menuRef.current.contains(event.target as Node)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const initials = (name: string) => name.split(/[\s._-]+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const handleLogout = async () => { await clientLogout("/login"); };
    const isAdmin = me ? ["ADMIN", "FOUNDER"].includes(me.role) : false;
    const avatarUrl = normalizeAssetUrl(me?.avatarUrl);
    const isDark = theme === "dark";

    const themeButton = (
        <motion.button
            type="button"
            onClick={toggleTheme}
            whileTap={{ scale: 0.94 }}
            className="group relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white/90 text-slate-700 transition-all hover:border-[#FFC916]/40 hover:text-[#FFC916] dark:border-white/12 dark:bg-white/[0.05] dark:text-white/72 dark:hover:border-[#FFC916]/35 dark:hover:text-[#FFC916]"
            aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
            title={isDark ? "Mode terang" : "Mode gelap"}
        >
            <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-[radial-gradient(circle,rgba(255,201,22,0.16),transparent_68%)]" />
            <motion.span
                key={theme}
                initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="relative z-10"
            >
                {isDark ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
            </motion.span>
        </motion.button>
    );

    return (
        <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-[#0e1015]/86 dark:shadow-[0_16px_45px_rgba(0,0,0,0.35)]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between sm:h-[4.5rem]">
                    <div className="flex items-center gap-2"><Swords className="h-8 w-8 text-[#FFC916]" /><span className="bg-gradient-to-r from-[#FFC916] to-[#FFC000] bg-clip-text text-lg font-bold text-transparent sm:text-xl">Duel Standby</span></div>
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-center space-x-3 lg:space-x-4">
                            {navLinks.map((link) => <Link key={link.name} href={link.href} className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#FFC916] dark:text-white/72 dark:hover:bg-white/[0.05] dark:hover:text-[#FFC916]">{link.name}</Link>)}
                            {themeButton}
                            {!me ? (<><Link href="/login" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-[#FFC916]/40 hover:text-[#FFC916] active:scale-[0.98] dark:border-white/15 dark:text-gray-300">Masuk</Link><Link href="/register" className="rounded-lg bg-gradient-to-r from-[#FFC916] to-[#FFC000] px-4 py-2 text-sm font-semibold text-[#2E2E2E] transition-all hover:shadow-[0_0_20px_rgba(255,201,22,0.3)] active:scale-[0.98]">Daftar</Link></>) : (
                                <div className="relative" ref={menuRef}>
                                    <button onClick={() => setMenuOpen((v) => !v)} className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200 transition-colors hover:border-[#FFC916]/50 dark:border-white/20" aria-label="Buka menu profil">
                                        {avatarUrl ? <img src={avatarUrl} alt={me.username} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-[#FFC916] text-xs font-bold text-[#2E2E2E]">{initials(me.username)}</div>}
                                        {!me.emailVerified && <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-[#2E2E2E]" />}
                                    </button>
                                    <AnimatePresence>{menuOpen && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#13161c] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"><Link href={isAdmin ? "/dashboard" : "/dashboard/profile"} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-white/10">{isAdmin ? "Dashboard" : "Profil Saya"}</Link>{!me.emailVerified && <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10">Verifikasi email</Link>}<button onClick={handleLogout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10">Keluar</button></motion.div>}</AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="md:hidden"><button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#FFC916] focus:outline-none dark:text-gray-400 dark:hover:bg-white/[0.06]">{isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}</button></div>
                </div>
            </div>
            <AnimatePresence>{isOpen && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-slate-200 bg-white/95 dark:border-white/10 dark:bg-[#0f1218]/96 md:hidden"><div className="space-y-2 px-3 pb-4 pt-3">{navLinks.map((link) => <Link key={link.name} href={link.href} onClick={() => setIsOpen(false)} className="block rounded-xl px-4 py-3 text-base font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#FFC916] dark:text-gray-300 dark:hover:bg-white/5">{link.name}</Link>)}<button onClick={toggleTheme} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-base font-medium text-slate-600 transition-colors hover:text-[#FFC916] active:scale-[0.99] dark:border-white/15 dark:bg-white/[0.04] dark:text-gray-300"><span>{theme === "dark" ? "Mode terang" : "Mode gelap"}</span><motion.span key={`mobile-${theme}`} initial={{ opacity: 0, rotate: -70, scale: 0.6 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} transition={{ duration: 0.22, ease: "easeOut" }}>{isDark ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}</motion.span></button>{!me ? <div className="grid grid-cols-1 gap-2 pt-1"><Link href="/login" onClick={() => setIsOpen(false)} className="block rounded-xl border border-slate-200 px-4 py-3 text-center text-base font-medium text-slate-600 transition-colors hover:text-[#FFC916] dark:border-white/15 dark:bg-white/[0.03] dark:text-gray-300">Masuk</Link><Link href="/register" onClick={() => setIsOpen(false)} className="block rounded-xl bg-gradient-to-r from-[#FFC916] to-[#FFC000] px-4 py-3 text-center text-base font-semibold text-[#2E2E2E]">Daftar</Link></div> : <div className="grid grid-cols-1 gap-2 pt-1"><Link href={isAdmin ? "/dashboard" : "/dashboard/profile"} onClick={() => setIsOpen(false)} className="block rounded-xl px-4 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#FFC916] dark:text-gray-300 dark:hover:bg-white/5">{isAdmin ? "Dashboard" : "Profil Saya"}</Link>{!me.emailVerified && <Link href="/dashboard/settings" onClick={() => setIsOpen(false)} className="block rounded-xl px-4 py-3 text-base font-medium text-amber-600 transition-colors hover:bg-amber-50 hover:text-amber-700 dark:text-amber-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-200">Verifikasi email</Link>}<button onClick={handleLogout} className="block w-full rounded-xl px-4 py-3 text-left text-base font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200">Keluar</button></div>}</div></motion.div>}</AnimatePresence>
        </nav>
    );
}


