"use client";

import { motion } from "framer-motion";
import { Calendar, Trophy, Users } from "lucide-react";

export function Tournaments() {
    const tournaments = [
        {
            id: 1,
            name: "DuelStandby Weekly #42",
            game: "Master Duel",
            date: "Feb 15, 2026",
            prize: "$100",
            status: "Registration Open",
            statusColor: "text-green-400 bg-green-400/10",
        },
        {
            id: 2,
            name: "KC Cup Prep Series",
            game: "Duel Links",
            date: "Feb 20, 2026",
            prize: "5000 Gems",
            status: "Upcoming",
            statusColor: "text-[#FFC916] bg-[#FFC916]/10",
        },
        {
            id: 3,
            name: "Monthly Championship",
            game: "Master Duel",
            date: "Jan 30, 2026",
            prize: "$250",
            status: "Completed",
            statusColor: "text-[#545454] bg-[#545454]/10",
        },
    ];

    return (
        <section id="tournaments" className="py-24 bg-[#2E2E2E] border-y border-[#3A3A3A]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h2 className="text-4xl font-bold text-white mb-2">Tournaments</h2>
                        <p className="text-[#E6E6E6]/60">Compete against the best and win prizes.</p>
                    </div>
                    <button className="px-6 py-2 bg-gradient-to-r from-[#FFC916] to-[#FFC000] hover:from-[#FFD54F] hover:to-[#FFC916] text-[#2E2E2E] rounded-lg font-medium transition-all hover:shadow-[0_0_15px_rgba(255,201,22,0.3)]">
                        View All Events
                    </button>
                </div>

                <div className="space-y-4">
                    {tournaments.map((tournament, index) => (
                        <motion.div
                            key={tournament.id}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group flex flex-col md:flex-row items-center justify-between p-6 bg-[#1A1A1A]/50 hover:bg-[#3A3A3A] rounded-xl border border-[#3A3A3A] hover:border-[#FFC916]/30 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-6 w-full md:w-auto mb-4 md:mb-0">
                                <div className="p-3 bg-[#2E2E2E] rounded-lg group-hover:bg-[#FFC916]/10 transition-colors">
                                    <Trophy className="w-8 h-8 text-[#FFC916]" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-[#FFC916] transition-colors">
                                        {tournament.name}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-[#E6E6E6]/50 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-4 h-4" /> {tournament.game}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" /> {tournament.date}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right mr-4">
                                    <p className="text-xs text-[#545454] uppercase tracking-wider font-semibold">Prize Pool</p>
                                    <p className="text-lg font-bold text-[#FFC916]">{tournament.prize}</p>
                                </div>
                                <span className={`px-4 py-1 rounded-full text-sm font-medium ${tournament.statusColor}`}>
                                    {tournament.status}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
