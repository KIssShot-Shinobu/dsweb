"use client";

import { motion } from "framer-motion";
import { BookOpen, ShieldCheck, Trophy, Users } from "lucide-react";

interface AboutProps {
    activeUserCount: number;
    tournamentCount: number;
}

export function About({ activeUserCount, tournamentCount }: AboutProps) {
    const cards = [
        { title: "Komunitas Aktif", icon: Users, description: `${activeUserCount} duelist aktif berdiskusi strategi, berbagi replay, dan menjaga ritme komunitas setiap hari.`, tone: "text-primary bg-primary/10" },
        { title: "Turnamen Terkelola", icon: Trophy, description: `${tournamentCount} turnamen dan event komunitas dengan alur pendaftaran, jadwal, dan informasi yang jelas.`, tone: "text-warning bg-warning/10" },
        { title: "Insight Meta", icon: BookOpen, description: "Referensi deck, pembacaan meta, dan diskusi matchup yang relevan dengan scene kompetitif.", tone: "text-accent bg-accent/10" },
        { title: "Main Sebagai Tim", icon: ShieldCheck, description: "Bangun chemistry bersama guild atau tim untuk duel yang lebih solid, terarah, dan kompetitif.", tone: "text-secondary bg-secondary/10" },
    ];

    return (
        <section id="about" className="relative overflow-hidden py-20 sm:py-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,201,22,0.12),transparent_24%)]" />
            <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-12 flex items-center justify-center sm:mb-16"
                >
                    <div className="stats stats-vertical w-full max-w-md border border-base-300 bg-base-100 shadow-lg sm:stats-horizontal">
                        <div className="stat text-center">
                            <div className="stat-value text-primary">{activeUserCount}</div>
                            <div className="stat-title">Duelist Aktif</div>
                        </div>
                        <div className="stat text-center">
                            <div className="stat-value text-primary">{tournamentCount}</div>
                            <div className="stat-title">Turnamen</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.45 }} className="mb-12 text-center sm:mb-16">
                    <h2 className="mb-4 bg-gradient-to-r from-primary via-warning to-base-content bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-5xl">Tempat duelists berkembang bersama</h2>
                    <p className="mx-auto max-w-2xl text-sm leading-relaxed text-base-content/70 sm:text-base lg:text-lg">Duel Standby menghadirkan pengalaman komunitas yang lebih profesional: turnamen tertata, komunikasi yang aktif, dan ruang belajar yang membantu setiap pemain naik level.</p>
                </motion.div>

                <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                    {cards.map((card, index) => (
                        <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="card border border-base-300 bg-base-100 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                            <div className="card-body p-5 sm:p-6">
                                <div className={`mb-4 flex w-fit items-center justify-center rounded-2xl p-3.5 sm:p-4 ${card.tone}`}>
                                    <card.icon className="h-7 w-7 sm:h-8 sm:w-8" />
                                </div>
                                <h3 className="mb-2 text-lg font-bold text-base-content sm:text-xl">{card.title}</h3>
                                <p className="text-sm leading-relaxed text-base-content/65">{card.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
