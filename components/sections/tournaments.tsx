"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { PublicTournamentCard, type PublicTournamentCardData } from "@/components/public/tournament-card";

interface TournamentsProps {
    tournaments: PublicTournamentCardData[];
}

export function Tournaments({ tournaments }: TournamentsProps) {
    return (
        <section id="tournaments" className="border-y border-gray-200 bg-gray-50 py-24 dark:border-[#3A3A3A] dark:bg-[#2E2E2E]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <p className="mb-3 text-sm font-bold uppercase tracking-[0.32em] text-[#FFC916]">Public Tournaments</p>
                        <h2 className="mb-3 text-4xl font-black text-gray-900 dark:text-white">Bracket aktif kini tampil sebagai card, bukan list biasa.</h2>
                        <p className="text-gray-600 dark:text-[#E6E6E6]/60">
                            Lihat preview event yang sedang buka, cek hadiah, lalu lanjut ke halaman khusus untuk seluruh tournament dan detail lengkap tiap bracket.
                        </p>
                    </div>
                    <Link
                        href="/tournaments"
                        className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-900 transition-all hover:border-[#FFC916] hover:text-[#b98a00] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-[#FFC916] dark:hover:text-[#FFC916]"
                    >
                        Lihat Semua Tournament
                    </Link>
                </div>

                {tournaments.length === 0 ? (
                    <div className="rounded-[28px] border border-white/10 bg-[#141414] px-6 py-16 text-center">
                        <Trophy className="mx-auto mb-4 h-12 w-12 text-[#FFC916]" />
                        <p className="text-lg text-white/55">Belum ada tournament aktif. Begitu event baru dibuka, card-nya akan muncul di sini.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {tournaments.map((tournament, index) => (
                            <motion.div
                                key={tournament.id}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.08 }}
                            >
                                <PublicTournamentCard tournament={tournament} compact />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
