"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { PublicTournamentCard, type PublicTournamentCardData } from "@/components/public/tournament-card";
import { useLocale } from "@/hooks/use-locale";

interface TournamentsProps {
    tournaments: PublicTournamentCardData[];
}

export function Tournaments({ tournaments }: TournamentsProps) {
    const { t } = useLocale();
    return (
        <section id="tournaments" className="border-y border-base-300 py-20 sm:py-24">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
                <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.45 }} className="mb-10 flex flex-col gap-5 sm:mb-12 sm:gap-6 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-primary sm:text-sm">{t.home.tournamentsBadge}</p>
                        <h2 className="mb-3 text-2xl font-black text-base-content sm:text-4xl">{t.home.tournamentsTitle}</h2>
                        <p className="text-sm text-base-content/70 sm:text-base">{t.home.tournamentsSubtitle}</p>
                    </div>
                    <Link href="/tournaments" className="btn btn-outline w-full rounded-box sm:w-auto">{t.home.tournamentsAll}</Link>
                </motion.div>
                {tournaments.length === 0 ? (
                    <div className="card border border-base-300 bg-base-100 shadow-xl">
                        <div className="card-body items-center px-6 py-14 text-center sm:py-16">
                            <Trophy className="mb-4 h-12 w-12 text-primary" />
                            <p className="text-sm text-base-content/65 sm:text-lg">{t.home.tournamentsEmpty}</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {tournaments.map((tournament, index) => (
                            <motion.div key={tournament.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}>
                                <PublicTournamentCard tournament={tournament} compact />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
