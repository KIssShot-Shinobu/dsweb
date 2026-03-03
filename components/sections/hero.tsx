"use client";

import { motion } from "framer-motion";
import { ArrowRight, Swords } from "lucide-react";
import Link from "next/link";

export function Hero() {
    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#2E2E2E] to-[#1A1A1A] z-0" />
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#FFC916]/20 rounded-full blur-3xl opacity-50 animate-pulse" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#FFC000]/20 rounded-full blur-3xl opacity-50 animate-pulse delay-1000" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center"
                >
                    <Swords className="w-16 h-16 text-[#FFC916] mb-6 drop-shadow-[0_0_15px_rgba(255,201,22,0.5)]" />

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
                        <span className="text-white">Duel</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC916] to-[#FFC000]">
                            Standby
                        </span>
                    </h1>

                    <p className="max-w-2xl text-lg md:text-xl text-[#E6E6E6]/70 mb-10 leading-relaxed">
                        The ultimate online community for Yu-Gi-Oh! Duel Links and Master Duel players.
                        Join tournaments, discuss meta strategies, and rise through the ranks.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            href="https://discord.gg/duelstandby"
                            target="_blank"
                            className="group px-8 py-4 bg-gradient-to-r from-[#FFC916] to-[#FFC000] hover:from-[#FFD54F] hover:to-[#FFC916] text-[#2E2E2E] rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(255,201,22,0.3)] hover:shadow-[0_0_30px_rgba(255,201,22,0.5)] flex items-center gap-2"
                        >
                            Join the Discord
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <Link
                            href="#tournaments"
                            className="px-8 py-4 bg-[#3A3A3A] hover:bg-[#545454] text-white rounded-full font-semibold border border-[#545454] transition-all"
                        >
                            View Tournaments
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
