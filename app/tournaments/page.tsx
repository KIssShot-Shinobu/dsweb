"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Tournament {
    id: string;
    title: string;
    gameType: "DUEL_LINKS" | "MASTER_DUEL";
    format: "BO1" | "BO3" | "BO5";
    status: "OPEN" | "ONGOING" | "COMPLETED" | "CANCELLED";
    entryFee: number;
    prizePool: number;
    startDate: string;
    _count?: { participants: number };
}

export default function PublicTournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/tournaments")
            .then(res => res.json())
            .then(data => {
                setTournaments(data.tournaments || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleRegister = async (tourneyId: string) => {
        setRegistering(tourneyId);
        try {
            const res = await fetch(`/api/tournaments/${tourneyId}/register`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                alert("Berhasil mendaftar turnamen!");
                setTournaments(prev => prev.map(t =>
                    t.id === tourneyId ? { ...t, _count: { participants: (t._count?.participants || 0) + 1 } } : t
                ));
            } else {
                alert(data.message || "Gagal mendaftar");
            }
        } catch (err) {
            alert("Kesalahan jaringan.");
        } finally {
            setRegistering(null);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">🏆 Duel Standby Tournaments</h1>
            <p className="text-gray-500 text-center mb-8">Ikuti kompetisi mingguan dan buktikan kamu yang terbaik.</p>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-white/5 animate-pulse rounded-2xl" />)}
                </div>
            ) : tournaments.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="text-5xl mb-4">📭</div>
                    <h3 className="text-xl font-bold dark:text-white">Belum Ada Turnamen</h3>
                    <p className="text-gray-400 mt-2">Nantikan jadwal turnamen selanjutnya!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tournaments.map((t, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={t.id}
                            className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col"
                        >
                            <div className={`p-4 ${t.gameType === 'MASTER_DUEL' ? 'bg-gradient-to-r from-red-900/40 to-orange-900/40' : 'bg-gradient-to-r from-blue-900/40 to-cyan-900/40'} border-b border-white/5`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border text-white ${t.status === 'OPEN' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
                                            t.status === 'ONGOING' ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' :
                                                'bg-gray-500/20 border-gray-500/30 text-gray-400'
                                        }`}>
                                        {t.status}
                                    </span>
                                    <span className="text-xs font-bold text-white/50 bg-black/20 px-2 py-1 rounded-md">{t.format}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white truncate">{t.title}</h3>
                            </div>

                            <div className="p-5 flex-1 flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-gray-50 dark:bg-white/[0.03] p-3 rounded-xl border border-gray-100 dark:border-white/5">
                                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Prize Pool</div>
                                        <div className="font-bold text-ds-amber">{formatCurrency(t.prizePool)}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-white/[0.03] p-3 rounded-xl border border-gray-100 dark:border-white/5">
                                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Entry Fee</div>
                                        <div className="font-bold text-gray-900 dark:text-white">{t.entryFee === 0 ? "FREE" : formatCurrency(t.entryFee)}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500 font-medium px-1">
                                    <span>🕒 {new Date(t.startDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span>👥 {t._count?.participants || 0} Terdaftar</span>
                                </div>
                            </div>

                            <div className="p-4 pt-0">
                                <button
                                    onClick={() => handleRegister(t.id)}
                                    disabled={t.status !== 'OPEN' || registering === t.id}
                                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${t.status === 'OPEN'
                                            ? 'bg-ds-amber hover:bg-ds-gold text-black'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {registering === t.id ? 'Memproses...' : t.status === 'OPEN' ? 'Daftar Sekarang' : 'Pendaftaran Ditutup'}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
