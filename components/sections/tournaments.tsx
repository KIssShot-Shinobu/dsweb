"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { PublicTournamentCard, type PublicTournamentCardData } from "@/components/public/tournament-card";

interface TournamentsProps { tournaments: PublicTournamentCardData[]; }

export function Tournaments({ tournaments }: TournamentsProps) {
    return (
        <section id="tournaments" className="border-y border-slate-200 bg-[linear-gradient(180deg,_#f8fafc_0%,_#fffdfa_100%)] py-20 sm:py-24 dark:border-[#3A3A3A] dark:bg-[#2E2E2E]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-10 flex flex-col gap-5 sm:mb-12 sm:gap-6 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <p className="mb-3 text-sm font-bold uppercase tracking-[0.32em] text-amber-600 dark:text-[#FFC916]">Public Tournaments</p>
                        <h2 className="mb-3 text-3xl font-black text-slate-950 sm:text-4xl dark:text-white">Bracket aktif kini tampil sebagai card, bukan list biasa.</h2>
                        <p className="text-slate-600 dark:text-[#E6E6E6]/60">Lihat preview event yang sedang buka, cek hadiah, lalu lanjut ke halaman khusus untuk seluruh tournament dan detail lengkap tiap bracket.</p>
                    </div>
                    <Link href="/tournaments" className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-all hover:border-[#FFC916] hover:text-[#b98a00] active:scale-[0.98] sm:w-auto dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-[#FFC916] dark:hover:text-[#FFC916]">Lihat Semua Tournament</Link>
                </div>
                {tournaments.length === 0 ? (
                    <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-14 text-center shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#141414] dark:shadow-none sm:py-16">
                        <Trophy className="mx-auto mb-4 h-12 w-12 text-amber-500 dark:text-[#FFC916]" />
                        <p className="text-base text-slate-500 sm:text-lg dark:text-white/55">Belum ada tournament aktif. Begitu event baru dibuka, card-nya akan muncul di sini.</p>
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
