"use client";

import { motion } from "framer-motion";
import { Users, Trophy, BookOpen, ShieldCheck } from "lucide-react";

export function About() {
    const cards = [
        {
            title: "Community First",
            icon: Users,
            description: "Join thousands of duelists sharing decks, strategies, and replays daily.",
            color: "bg-blue-500/10 text-blue-400",
        },
        {
            title: "Competitive Play",
            icon: Trophy,
            description: "Weekly tournaments for Duel Links and Master Duel with seasonal leaderboards.",
            color: "bg-yellow-500/10 text-yellow-400",
        },
        {
            title: "Meta Analysis",
            icon: BookOpen,
            description: "In-depth guides and tier lists curated by top-ranked players.",
            color: "bg-pink-500/10 text-pink-400",
        },
        {
            title: "Guild Wars",
            icon: ShieldCheck,
            description: "Represent your team in epic guild vs guild battles.",
            color: "bg-green-500/10 text-green-400",
        },
    ];

    return (
        <section id="about" className="py-24 bg-zinc-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:50px_50px]" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500 mb-4">
                        Where Duelists Unite
                    </h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
                        DuelStandby is more than just a Discord server. It's a thriving ecosystem for players of all skill levels to improve, compete, and connect.
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
                            className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                        >
                            <div className={`p-4 rounded-xl w-fit mb-4 ${card.color}`}>
                                <card.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-100 mb-2">{card.title}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                {card.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
