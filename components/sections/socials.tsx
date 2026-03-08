"use client";

import { motion } from "framer-motion";
import { Twitter, Youtube } from "lucide-react";

const DiscordIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" className={className}><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 3.999 3.999 0 0 0-.332.358 6.437 6.437 0 0 1-5.042.062 13.562 13.562 0 0 0-.25-.337.074.074 0 0 0-.079-.037 19.736 19.736 0 0 0-4.881 1.515.071.071 0 0 0-.03.029C-1.87 11.231-.02 21.01.033 21.143a.08.08 0 0 0 .041.055 19.919 19.919 0 0 0 5.993 3.018.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.018.077.077 0 0 0 .041-.055c.533-8.544-2.825-15.548-7.906-16.772a.071.071 0 0 0-.03-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
);

export function Socials() {
    const socials = [
        { name: "Discord", icon: DiscordIcon, link: "https://discord.gg/duelstandby", color: "from-[#5865F2] to-[#7b84ff]", description: "Chat, voice, dan lobby turnamen" },
        { name: "YouTube", icon: Youtube, link: "https://youtube.com/@duelstandby", color: "from-[#FF0000] to-[#ff6a6a]", description: "Replay, highlight, dan cuplikan event" },
        { name: "Twitter", icon: Twitter, link: "https://twitter.com/duelstandby", color: "from-[#1DA1F2] to-[#7fd2ff]", description: "Update singkat dan pengumuman" },
    ];

    return (
        <section id="socials" className="relative bg-[linear-gradient(180deg,_#f8fafc_0%,_#fffdf8_100%)] py-20 sm:py-24 dark:bg-[linear-gradient(180deg,_#111217_0%,_#09090b_100%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,201,22,0.12),transparent_24%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,201,22,0.1),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_24%)]" />
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.h2 initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.45 }} className="mb-12 text-center text-3xl font-bold tracking-tight text-slate-950 sm:mb-16 md:text-5xl dark:text-white">Tetap Terhubung</motion.h2>
                <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3 md:gap-8">
                    {socials.map((social) => (
                        <motion.a key={social.name} href={social.link} target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.38 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-all dark:border-white/10 dark:bg-[#11161d] dark:shadow-[0_18px_55px_rgba(0,0,0,0.24)] sm:p-8">
                            <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${social.color}`} />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.5),transparent_45%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100 dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_42%)]" />
                            <div className="relative z-10 text-slate-900 dark:text-white">
                                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br ${social.color} text-white shadow-lg sm:h-20 sm:w-20 sm:rounded-[24px]`}><social.icon className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.5} /></div>
                                <h3 className="mb-2 text-xl font-bold sm:text-2xl">{social.name}</h3>
                                <p className="text-sm font-medium text-slate-500 sm:text-base dark:text-white/72">{social.description}</p>
                            </div>
                        </motion.a>
                    ))}
                </div>
            </div>
        </section>
    );
}
