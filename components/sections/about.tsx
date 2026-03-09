"use client";

import { motion } from "framer-motion";
import { Users, Trophy, BookOpen, ShieldCheck } from "lucide-react";

interface AboutProps {
    activeUserCount: number;
    tournamentCount: number;
}

export function About({ activeUserCount, tournamentCount }: AboutProps) {
    const cards = [
        { title: "Komunitas Aktif", icon: Users, description: `${activeUserCount} duelist aktif berdiskusi strategi, berbagi replay, dan menjaga ritme komunitas setiap hari.`, color: "bg-amber-100 text-amber-600 dark:bg-[#FFC916]/10 dark:text-[#FFC916]" },
        { title: "Turnamen Terkelola", icon: Trophy, description: `${tournamentCount} turnamen dan event komunitas dengan alur pendaftaran, jadwal, dan informasi yang jelas.`, color: "bg-orange-100 text-orange-600 dark:bg-[#FFC000]/10 dark:text-[#FFC000]" },
        { title: "Insight Meta", icon: BookOpen, description: "Referensi deck, pembacaan meta, dan diskusi matchup yang relevan dengan scene kompetitif.", color: "bg-sky-100 text-sky-600 dark:bg-[#1b2430] dark:text-[#E6E6E6]" },
        { title: "Main Sebagai Tim", icon: ShieldCheck, description: "Bangun chemistry bersama guild atau tim untuk duel yang lebih solid, terarah, dan kompetitif.", color: "bg-amber-100 text-amber-600 dark:bg-[#FFC916]/10 dark:text-[#FFC916]" },
    ];

    return (
        <section id="about" className="relative overflow-hidden bg-[linear-gradient(180deg,_#fffdfa_0%,_#f8fafc_100%)] py-20 sm:py-24 dark:bg-[linear-gradient(180deg,_#0d0d10_0%,_#111217_100%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,201,22,0.12),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,201,22,0.10),transparent_24%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] dark:bg-[length:auto,50px_50px,50px_50px]" />
            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 flex justify-center gap-6 sm:mb-16 sm:gap-12">
                    <div className="text-center">
                        <div className="text-3xl font-extrabold text-amber-500 sm:text-4xl dark:text-[#FFC916]">{activeUserCount}</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:text-sm dark:text-[#E6E6E6]/50">Duelist Aktif</div>
                    </div>
                    <div className="w-px bg-slate-200 dark:bg-[#3A3A3A]" />
                    <div className="text-center">
                        <div className="text-3xl font-extrabold text-amber-500 sm:text-4xl dark:text-[#FFC916]">{tournamentCount}</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:text-sm dark:text-[#E6E6E6]/50">Turnamen Terselenggara</div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.45 }} className="mb-12 text-center sm:mb-16">
                    <h2 className="mb-4 bg-gradient-to-r from-amber-500 via-amber-400 to-slate-700 bg-clip-text text-3xl font-bold text-transparent md:text-5xl dark:from-[#FFC916] dark:via-[#ffe17a] dark:to-white">Tempat duelists berkembang bersama</h2>
                    <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-white/60">Duel Standby menghadirkan pengalaman komunitas yang lebih profesional: turnamen tertata, komunikasi yang aktif, dan ruang belajar yang membantu setiap pemain naik level.</p>
                </motion.div>

                <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                    {cards.map((card, index) => (
                        <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="rounded-2xl border border-slate-200 bg-white/92 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-[#FFC916]/30 hover:bg-amber-50 active:scale-[0.99] sm:p-6 dark:border-white/10 dark:bg-[#11161d] dark:shadow-[0_18px_60px_rgba(0,0,0,0.22)] dark:hover:border-[#FFC916]/20 dark:hover:bg-[#161d27]">
                            <div className={`mb-4 w-fit rounded-xl p-3.5 sm:p-4 ${card.color}`}><card.icon className="h-7 w-7 sm:h-8 sm:w-8" /></div>
                            <h3 className="mb-2 text-lg font-bold text-slate-900 sm:text-xl dark:text-[#E6E6E6]">{card.title}</h3>
                            <p className="text-sm leading-relaxed text-slate-600 dark:text-white/55">{card.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
