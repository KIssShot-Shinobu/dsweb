"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Swords } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "#about" },
    { name: "Tournaments", href: "#tournaments" },
    { name: "Community", href: "#socials" },
];

type MeUser = {
    fullName: string;
    avatarUrl: string | null;
    role: string;
};

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [me, setMe] = useState<MeUser | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.success && data.user) {
                    setMe({
                        fullName: data.user.fullName,
                        avatarUrl: data.user.avatarUrl ?? null,
                        role: data.user.role ?? "USER",
                    });
                }
            })
            .catch(() => {
                setMe(null);
            });
    }, []);

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const initials = (name: string) =>
        name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
    };

    const isAdmin = me ? ["ADMIN", "FOUNDER"].includes(me.role) : false;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#2E2E2E]/90 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <Swords className="w-8 h-8 text-[#FFC916]" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#FFC916] to-[#FFC000]">
                            DuelStandby
                        </span>
                    </div>

                    <div className="hidden md:block">
                        <div className="ml-10 flex items-center space-x-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="text-gray-600 dark:text-gray-300 hover:text-[#FFC916] px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <button
                                onClick={toggleTheme}
                                className="text-gray-600 dark:text-gray-300 hover:text-[#FFC916] px-3 py-2 rounded-md text-sm font-medium transition-colors border border-gray-200 dark:border-white/15"
                            >
                                {theme === "dark" ? "Light" : "Dark"}
                            </button>

                            {!me ? (
                                <>
                                    <Link
                                        href="/login"
                                        className="text-gray-600 dark:text-gray-300 hover:text-[#FFC916] px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 dark:border-white/15 hover:border-[#FFC916]/40 transition-all"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="text-[#2E2E2E] bg-gradient-to-r from-[#FFC916] to-[#FFC000] px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-[0_0_20px_rgba(255,201,22,0.3)] transition-all"
                                    >
                                        Sign Up
                                    </Link>
                                </>
                            ) : (
                                <div className="relative" ref={menuRef}>
                                    <button
                                        onClick={() => setMenuOpen((v) => !v)}
                                        className="w-10 h-10 rounded-full overflow-hidden border border-white/20 hover:border-[#FFC916]/50 transition-colors"
                                        aria-label="Open profile menu"
                                    >
                                        {me.avatarUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={me.avatarUrl} alt={me.fullName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-[#FFC916] text-[#2E2E2E] font-bold text-xs flex items-center justify-center">
                                                {initials(me.fullName)}
                                            </div>
                                        )}
                                    </button>

                                    <AnimatePresence>
                                        {menuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-[#1F1F1F] p-2 shadow-xl"
                                            >
                                                <Link
                                                    href={isAdmin ? "/dashboard" : "/dashboard/profile"}
                                                    onClick={() => setMenuOpen(false)}
                                                    className="block px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/10"
                                                >
                                                    {isAdmin ? "Dashboard" : "Profile"}
                                                </Link>
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/10"
                                                >
                                                    Logout
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-[#FFC916] hover:bg-gray-100 dark:hover:bg-[#3A3A3A] focus:outline-none"
                        >
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white/95 dark:bg-[#2E2E2E]/95 border-b border-gray-200 dark:border-white/10 overflow-hidden"
                    >
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-600 dark:text-gray-300 hover:text-[#FFC916] block px-3 py-2 rounded-md text-base font-medium"
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <button
                                onClick={toggleTheme}
                                className="w-full text-left text-gray-600 dark:text-gray-300 hover:text-[#FFC916] block px-3 py-2 rounded-md text-base font-medium border border-gray-200 dark:border-white/15"
                            >
                                {theme === "dark" ? "Light Mode" : "Dark Mode"}
                            </button>

                            {!me ? (
                                <>
                                    <Link
                                        href="/login"
                                        onClick={() => setIsOpen(false)}
                                        className="text-gray-600 dark:text-gray-300 hover:text-[#FFC916] block px-3 py-2 rounded-md text-base font-medium border border-gray-200 dark:border-white/15"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/register"
                                        onClick={() => setIsOpen(false)}
                                        className="text-[#2E2E2E] bg-gradient-to-r from-[#FFC916] to-[#FFC000] block px-3 py-2 rounded-md text-base font-semibold"
                                    >
                                        Sign Up
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href={isAdmin ? "/dashboard" : "/dashboard/profile"}
                                        onClick={() => setIsOpen(false)}
                                        className="text-gray-300 hover:text-[#FFC916] block px-3 py-2 rounded-md text-base font-medium"
                                    >
                                        {isAdmin ? "Dashboard" : "Profile"}
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left text-red-300 hover:text-red-200 block px-3 py-2 rounded-md text-base font-medium"
                                    >
                                        Logout
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
