"use client";

import { motion } from "framer-motion";
import { Users, Trophy, BookOpen, ShieldCheck } from "lucide-react";

interface AboutProps {
    activeUserCount: number;
    tournamentCount: number;
}

export function About({ activeUserCount, tournamentCount }: AboutProps) {
    const cards = [
        { title: "Community First", icon: Users, description: `${activeUserCount} active duelists sharing decks, strategies, and replays daily.`, color: "bg-amber-100 text-amber-600 dark:bg-[#FFC916]/10 dark:text-[#FFC916]" },
        { title: "Competitive Play", icon: Trophy, description: `${tournamentCount} tournaments held for Duel Links and Master Duel with seasonal leaderboards.`, color: "bg-orange-100 text-orange-600 dark:bg-[#FFC000]/10 dark:text-[#FFC000]" },
        { title: "Meta Analysis", icon: BookOpen, description: "In-depth guides and tier lists curated by top-ranked players.", color: "bg-sky-100 text-sky-600 dark:bg-slate-100/10 dark:text-[#E6E6E6]" },
        { title: "Guild Wars", icon: ShieldCheck, description: "Represent your team in epic guild vs guild battles.", color: "bg-amber-100 text-amber-600 dark:bg-[#FFC916]/10 dark:text-[#FFC916]" },
    ];

    return (
        <section id="about" className="relative overflow-hidden bg-[linear-gradient(180deg,_#fffdfa_0%,_#f8fafc_100%)] py-20 sm:py-24 dark:bg-[#1A1A1A]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,201,22,0.12),transparent_24%)] dark:bg-grid-white/[0.02] dark:bg-[length:50px_50px]" />
            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 flex justify-center gap-6 sm:mb-16 sm:gap-12">
                    <div className="text-center">
                        <div className="text-3xl font-extrabold text-amber-500 sm:text-4xl dark:text-[#FFC916]">{activeUserCount}</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:text-sm dark:text-[#E6E6E6]/50">Active Users</div>
                    </div>
                    <div className="w-px bg-slate-200 dark:bg-[#3A3A3A]" />
                    <div className="text-center">
                        <div className="text-3xl font-extrabold text-amber-500 sm:text-4xl dark:text-[#FFC916]">{tournamentCount}</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:text-sm dark:text-[#E6E6E6]/50">Tournaments</div>
                    </div>
                </motion.div>

                <div className="mb-12 text-center sm:mb-16">
                    <h2 className="mb-4 bg-gradient-to-r from-amber-500 via-amber-400 to-slate-700 bg-clip-text text-3xl font-bold text-transparent md:text-5xl dark:from-[#FFC916] dark:to-[#E6E6E6]">Where Duelists Unite</h2>
                    <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-[#E6E6E6]/60">DuelStandby is more than just a Discord server. It&apos;s a thriving ecosystem for players of all skill levels to improve, compete, and connect.</p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                    {cards.map((card, index) => (
                        <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="rounded-2xl border border-slate-200 bg-white/92 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-[#FFC916]/30 hover:bg-amber-50 active:scale-[0.99] sm:p-6 dark:border-[#3A3A3A] dark:bg-[#2E2E2E]/50 dark:hover:bg-[#3A3A3A]/50 dark:shadow-none">
                            <div className={`mb-4 w-fit rounded-xl p-3.5 sm:p-4 ${card.color}`}><card.icon className="h-7 w-7 sm:h-8 sm:w-8" /></div>
                            <h3 className="mb-2 text-lg font-bold text-slate-900 sm:text-xl dark:text-[#E6E6E6]">{card.title}</h3>
                            <p className="text-sm leading-relaxed text-slate-600 dark:text-[#E6E6E6]/50">{card.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
