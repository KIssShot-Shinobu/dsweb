"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Swords } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/social-links";

export function Hero() {
    const communityLink = SOCIAL_LINKS.discord || "/register";

    return (
        <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden sm:min-h-[90vh]">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(255,201,22,0.18),transparent_24%),linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.02)_100%)]" />
            <div className="absolute inset-0 z-0 opacity-0 dark:opacity-100 ds-grid-bg" />
            <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl opacity-50 sm:h-96 sm:w-96" />
            <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-accent/20 blur-3xl opacity-50 sm:h-96 sm:w-96" />

            <div className="relative z-10 mx-auto max-w-[1400px] px-4 pb-12 pt-24 text-center sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
                <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.08, delayChildren: 0.08 }} className="flex flex-col items-center">
                    <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.45 }} className="badge badge-primary badge-outline mb-4 h-auto rounded-full px-4 py-3 text-[11px] font-bold uppercase tracking-[0.28em]">
                        Komunitas Yu-Gi-Oh! Duel Links & Master Duel
                    </motion.div>

                    <motion.div variants={{ hidden: { opacity: 0, y: 18, scale: 0.92 }, show: { opacity: 1, y: 0, scale: 1 } }} transition={{ duration: 0.5 }} className="badge badge-primary mb-5 h-16 w-16 rounded-[24px] border-0 shadow-xl sm:mb-6 sm:h-20 sm:w-20 sm:rounded-[28px]">
                        <Swords className="h-8 w-8 sm:h-10 sm:w-10" />
                    </motion.div>

                    <motion.h1 variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.55 }} className="mb-5 text-3xl font-extrabold tracking-tight sm:mb-6 sm:text-5xl md:text-7xl">
                        <span className="text-base-content">Duel </span>
                        <span className="bg-gradient-to-r from-primary to-warning bg-clip-text text-transparent">Standby</span>
                    </motion.h1>

                    <motion.p variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.55 }} className="mb-8 max-w-2xl text-sm leading-relaxed text-base-content/70 sm:mb-10 sm:text-lg md:text-xl">
                        Komunitas gaming yang menyatukan duelists serius dalam ekosistem yang tertata, kompetitif, dan suportif. Ikuti turnamen terkurasi, bangun relasi, dan tingkatkan permainan Anda bersama Duel Standby.
                    </motion.p>

                    <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.5 }} className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
                        <Link href={communityLink} target={SOCIAL_LINKS.discord ? "_blank" : undefined} className="btn btn-primary rounded-full px-6 sm:px-8">
                            {SOCIAL_LINKS.discord ? "Gabung ke Discord" : "Gabung Komunitas"}
                            <ArrowRight className="h-5 w-5" />
                        </Link>

                        <Link href="#tournaments" className="btn btn-outline rounded-full px-6 sm:px-8">
                            Jelajahi Turnamen
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
