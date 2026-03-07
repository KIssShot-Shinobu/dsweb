"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FormSelect } from "@/components/dashboard/form-select";

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

const statusOptions = [
    { value: "ALL", label: "Semua Status" },
    { value: "OPEN", label: "OPEN" },
    { value: "ONGOING", label: "ONGOING" },
    { value: "COMPLETED", label: "COMPLETED" },
];

const gameOptions = [
    { value: "ALL", label: "Semua Game" },
    { value: "DUEL_LINKS", label: "Duel Links" },
    { value: "MASTER_DUEL", label: "Master Duel" },
];

export default function PublicTournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [gameFilter, setGameFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchTournaments = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (gameFilter !== "ALL") params.set("gameType", gameFilter);
        if (search.trim()) params.set("search", search.trim());

        fetch(`/api/tournaments?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                setTournaments(data.tournaments || []);
            })
            .catch(() => {
                setTournaments([]);
                setMessage({ type: "error", text: "Gagal memuat daftar turnamen." });
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchTournaments();
    }, [statusFilter, gameFilter, search]);

    useEffect(() => () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    }, []);

    const handleRegister = async (tournamentId: string) => {
        setRegistering(tournamentId);
        setMessage(null);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/register`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: "success", text: data.message || "Berhasil mendaftar turnamen." });
                setTournaments((prev) =>
                    prev.map((tournament) =>
                        tournament.id === tournamentId
                            ? {
                                ...tournament,
                                _count: { participants: (tournament._count?.participants || 0) + 1 },
                            }
                            : tournament
                    )
                );
            } else {
                setMessage({ type: "error", text: data.message || "Gagal mendaftar turnamen." });
            }
        } catch {
            setMessage({ type: "error", text: "Kesalahan jaringan." });
        } finally {
            setRegistering(null);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

    const getStatusClass = (status: Tournament["status"]) => {
        if (status === "OPEN") return "bg-emerald-500/20 border-emerald-500/30 text-emerald-300";
        if (status === "ONGOING") return "bg-amber-500/20 border-amber-500/30 text-amber-300";
        if (status === "COMPLETED") return "bg-blue-500/20 border-blue-500/30 text-blue-300";
        return "bg-gray-500/20 border-gray-500/30 text-gray-400";
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white">Tournaments</h1>
            <p className="mb-8 text-center text-gray-500">Ikuti kompetisi guild dan daftar langsung dari halaman ini.</p>

            {message && (
                <div className={`mx-auto mb-6 max-w-3xl rounded-2xl border px-4 py-3 text-sm ${message.type === "success"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                    : "border-red-500/20 bg-red-500/10 text-red-400"
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="mx-auto mb-6 grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px]">
                <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => {
                        const nextValue = event.target.value;
                        setSearchInput(nextValue);
                        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                        searchTimeoutRef.current = setTimeout(() => {
                            setSearch(nextValue);
                        }, 250);
                    }}
                    placeholder="Cari judul turnamen..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-ds-amber dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                />
                <FormSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
                <FormSelect value={gameFilter} onChange={setGameFilter} options={gameOptions} />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
                    ))}
                </div>
            ) : tournaments.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white py-20 text-center dark:border-white/5 dark:bg-[#1a1a1a]">
                    <div className="mb-4 text-5xl">[]</div>
                    <h3 className="text-xl font-bold dark:text-white">Belum Ada Turnamen</h3>
                    <p className="mt-2 text-gray-400">Coba ubah filter atau tunggu jadwal turnamen berikutnya.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {tournaments.map((tournament, index) => (
                        <motion.div
                            key={tournament.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.06 }}
                            className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1a1a1a]"
                        >
                            <div className={`border-b border-white/5 p-4 ${tournament.gameType === "MASTER_DUEL"
                                ? "bg-gradient-to-r from-red-900/40 to-orange-900/40"
                                : "bg-gradient-to-r from-blue-900/40 to-cyan-900/40"
                                }`}>
                                <div className="mb-2 flex items-start justify-between">
                                    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClass(tournament.status)}`}>
                                        {tournament.status}
                                    </span>
                                    <span className="rounded-md bg-black/20 px-2 py-1 text-xs font-bold text-white/50">{tournament.format}</span>
                                </div>
                                <h3 className="truncate text-xl font-bold text-white">{tournament.title}</h3>
                            </div>

                            <div className="flex flex-1 flex-col gap-3 p-5">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                                        <div className="mb-1 text-[10px] font-bold uppercase text-gray-500">Prize Pool</div>
                                        <div className="font-bold text-ds-amber">{formatCurrency(tournament.prizePool)}</div>
                                    </div>
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                                        <div className="mb-1 text-[10px] font-bold uppercase text-gray-500">Entry Fee</div>
                                        <div className="font-bold text-gray-900 dark:text-white">
                                            {tournament.entryFee === 0 ? "FREE" : formatCurrency(tournament.entryFee)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between px-1 text-xs font-medium text-gray-500">
                                    <span>{new Date(tournament.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                    <span>{tournament._count?.participants || 0} terdaftar</span>
                                </div>
                            </div>

                            <div className="p-4 pt-0">
                                <button
                                    onClick={() => handleRegister(tournament.id)}
                                    disabled={tournament.status !== "OPEN" || registering === tournament.id}
                                    className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${tournament.status === "OPEN"
                                        ? "bg-ds-amber text-black hover:bg-ds-gold"
                                        : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/5"
                                        }`}
                                >
                                    {registering === tournament.id ? "Memproses..." : tournament.status === "OPEN" ? "Daftar Sekarang" : "Pendaftaran Ditutup"}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
