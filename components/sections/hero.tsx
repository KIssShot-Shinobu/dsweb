"use client";

import { motion } from "framer-motion";
import { ArrowRight, Swords } from "lucide-react";
import Link from "next/link";

export function Hero() {
    return (
        <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden sm:min-h-[90vh]">
            <div className="absolute inset-0 z-0 bg-[linear-gradient(180deg,_#fffdf7_0%,_#fff7db_42%,_#f8fafc_100%)] dark:bg-gradient-to-br dark:from-[#1A1A1A] dark:via-[#2E2E2E] dark:to-[#1A1A1A]" />
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(255,201,22,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_24%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,201,22,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_22%)]" />
            <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-[#FFC916]/20 blur-3xl opacity-40 animate-pulse sm:h-96 sm:w-96 dark:opacity-50" />
            <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl opacity-40 animate-pulse delay-1000 sm:h-96 sm:w-96 dark:bg-[#FFC000]/20 dark:opacity-50" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-24 text-center sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex flex-col items-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] border border-amber-200 bg-white/80 shadow-[0_18px_50px_rgba(255,201,22,0.18)] sm:mb-6 sm:h-20 sm:w-20 sm:rounded-[28px] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_0_15px_rgba(255,201,22,0.25)]">
                        <Swords className="h-8 w-8 text-[#FFC916] sm:h-10 sm:w-10" />
                    </div>

                    <h1 className="mb-5 text-4xl font-extrabold tracking-tight sm:mb-6 sm:text-5xl md:text-7xl">
                        <span className="text-slate-950 dark:text-white">Duel</span>
                        <span className="bg-gradient-to-r from-[#FFC916] to-[#FFC000] bg-clip-text text-transparent">Standby</span>
                    </h1>

                    <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600 sm:mb-10 sm:text-lg md:text-xl dark:text-[#E6E6E6]/70">
                        The ultimate online community for Yu-Gi-Oh! Duel Links and Master Duel players. Join tournaments, discuss meta strategies, and rise through the ranks.
                    </p>

                    <div className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
                        <Link href="https://discord.gg/duelstandby" target="_blank" className="group flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FFC916] to-[#FFC000] px-6 py-3.5 font-semibold text-[#2E2E2E] shadow-[0_0_20px_rgba(255,201,22,0.28)] transition-all hover:from-[#FFD54F] hover:to-[#FFC916] hover:shadow-[0_0_30px_rgba(255,201,22,0.42)] active:scale-[0.98] sm:px-8 sm:py-4">
                            Join the Discord
                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Link>

                        <Link href="#tournaments" className="rounded-full border border-slate-200 bg-white/85 px-6 py-3.5 font-semibold text-slate-900 transition-all hover:border-amber-300 hover:bg-white active:scale-[0.98] sm:px-8 sm:py-4 dark:border-[#545454] dark:bg-[#3A3A3A] dark:text-white dark:hover:bg-[#545454]">
                            View Tournaments
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
