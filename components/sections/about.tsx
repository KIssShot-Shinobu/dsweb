"use client";

import { motion } from "framer-motion";
import { Users, Trophy, BookOpen, ShieldCheck } from "lucide-react";

interface AboutProps {
    memberCount: number;
    tournamentCount: number;
}

export function About({ memberCount, tournamentCount }: AboutProps) {
    const cards = [
        {
            title: "Community First",
            icon: Users,
            description: `${memberCount} registered duelists sharing decks, strategies, and replays daily.`,
            color: "bg-[#FFC916]/10 text-[#FFC916]",
        },
        {
            title: "Competitive Play",
            icon: Trophy,
            description: `${tournamentCount} tournaments held for Duel Links and Master Duel with seasonal leaderboards.`,
            color: "bg-[#FFC000]/10 text-[#FFC000]",
        },
        {
            title: "Meta Analysis",
            icon: BookOpen,
            description: "In-depth guides and tier lists curated by top-ranked players.",
            color: "bg-[#E6E6E6]/10 text-[#E6E6E6]",
        },
        {
            title: "Guild Wars",
            icon: ShieldCheck,
            description: "Represent your team in epic guild vs guild battles.",
            color: "bg-[#FFC916]/10 text-[#FFC916]",
        },
    ];

    return (
        <section id="about" className="py-24 bg-white dark:bg-[#1A1A1A] relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:50px_50px]" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex justify-center gap-12 mb-16"
                >
                    <div className="text-center">
                        <div className="text-4xl font-extrabold text-[#FFC916]">{memberCount}</div>
                        <div className="text-sm text-gray-500 dark:text-[#E6E6E6]/50 mt-1 uppercase tracking-wider font-semibold">Members</div>
                    </div>
                    <div className="w-px bg-gray-200 dark:bg-[#3A3A3A]" />
                    <div className="text-center">
                        <div className="text-4xl font-extrabold text-[#FFC916]">{tournamentCount}</div>
                        <div className="text-sm text-gray-500 dark:text-[#E6E6E6]/50 mt-1 uppercase tracking-wider font-semibold">Tournaments</div>
                    </div>
                </motion.div>

                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#FFC916] to-[#E6E6E6] mb-4">
                        Where Duelists Unite
                    </h2>
                    <p className="text-gray-600 dark:text-[#E6E6E6]/60 max-w-2xl mx-auto text-lg leading-relaxed">
                        DuelStandby is more than just a Discord server. It&apos;s a thriving ecosystem for players of all skill levels to improve, compete, and connect.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {cards.map((card, index) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="p-6 rounded-2xl border border-gray-200 dark:border-[#3A3A3A] bg-white/90 dark:bg-[#2E2E2E]/50 hover:bg-amber-50 dark:hover:bg-[#3A3A3A]/50 hover:scale-105 transition-all duration-300 backdrop-blur-sm hover:border-[#FFC916]/30"
                        >
                            <div className={`p-4 rounded-xl w-fit mb-4 ${card.color}`}>
                                <card.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-[#E6E6E6] mb-2">{card.title}</h3>
                            <p className="text-gray-600 dark:text-[#E6E6E6]/50 text-sm leading-relaxed">{card.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
