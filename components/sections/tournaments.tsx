"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Trophy, Gamepad2 } from "lucide-react";

interface Tournament {
    id: string;
    title: string;
    gameType: string;
    startDate: string;
    prizePool: number;
    status: string;
    image: string | null;
}

const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
        case "ONGOING": return "text-green-400 bg-green-400/10";
        case "UPCOMING": return "text-[#FFC916] bg-[#FFC916]/10";
        default: return "text-[#545454] bg-[#545454]/10";
    }
};

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const formatPrize = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export function Tournaments() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/tournaments")
            .then((r) => r.json())
            .then((data) => {
                // Sort: ONGOING first, then UPCOMING, then COMPLETED
                const sorted = (Array.isArray(data) ? data : []).sort((a: Tournament, b: Tournament) => {
                    const order = { ONGOING: 0, UPCOMING: 1, COMPLETED: 2 };
                    return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
                });
                setTournaments(sorted.slice(0, 5));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <section id="tournaments" className="py-24 bg-[#2E2E2E] border-y border-[#3A3A3A]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h2 className="text-4xl font-bold text-white mb-2">Tournaments</h2>
                        <p className="text-[#E6E6E6]/60">Compete against the best and win prizes.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 rounded-xl bg-[#1A1A1A]/50 border border-[#3A3A3A] animate-pulse" />
                        ))}
                    </div>
                ) : tournaments.length === 0 ? (
                    <div className="text-center py-16">
                        <Trophy className="w-12 h-12 text-[#545454] mx-auto mb-4" />
                        <p className="text-[#E6E6E6]/40 text-lg">No tournaments yet. Stay tuned!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tournaments.map((tournament, index) => (
                            <motion.div
                                key={tournament.id}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.08 }}
                                className="group flex flex-col md:flex-row items-center justify-between p-6 bg-[#1A1A1A]/50 hover:bg-[#3A3A3A] rounded-xl border border-[#3A3A3A] hover:border-[#FFC916]/30 transition-all cursor-default"
                            >
                                <div className="flex items-center gap-5 w-full md:w-auto mb-4 md:mb-0">
                                    {/* Thumbnail or icon */}
                                    <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-[#2E2E2E] flex items-center justify-center group-hover:bg-[#FFC916]/10 transition-colors">
                                        {tournament.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={tournament.image} alt={tournament.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <Trophy className="w-7 h-7 text-[#FFC916]" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-[#FFC916] transition-colors">
                                            {tournament.title}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-[#E6E6E6]/50 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Gamepad2 className="w-4 h-4" /> {tournament.gameType}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" /> {formatDate(tournament.startDate)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end">
                                    <div className="text-right mr-2">
                                        <p className="text-xs text-[#545454] uppercase tracking-wider font-semibold">Prize Pool</p>
                                        <p className="text-lg font-bold text-[#FFC916]">{formatPrize(tournament.prizePool)}</p>
                                    </div>
                                    <span className={`px-4 py-1 rounded-full text-sm font-medium ${getStatusStyle(tournament.status)}`}>
                                        {tournament.status.charAt(0) + tournament.status.slice(1).toLowerCase()}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
