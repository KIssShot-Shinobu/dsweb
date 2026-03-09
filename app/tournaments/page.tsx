"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { FormSelect } from "@/components/dashboard/form-select";
import { PublicTournamentCard, type PublicTournamentCardData } from "@/components/public/tournament-card";

type TournamentResponse = PublicTournamentCardData & {
    _count?: { participants: number };
};

const statusOptions = [
    { value: "ALL", label: "Semua Status" },
    { value: "OPEN", label: "Registrasi Dibuka" },
    { value: "ONGOING", label: "Sedang Berlangsung" },
    { value: "COMPLETED", label: "Selesai" },
    { value: "CANCELLED", label: "Dibatalkan" },
];

const gameOptions = [
    { value: "ALL", label: "Semua Game" },
    { value: "DUEL_LINKS", label: "Duel Links" },
    { value: "MASTER_DUEL", label: "Master Duel" },
];

export default function PublicTournamentsPage() {
    const [tournaments, setTournaments] = useState<PublicTournamentCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [gameFilter, setGameFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setLoading(true);
        setMessage(null);

        const params = new URLSearchParams();
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (gameFilter !== "ALL") params.set("gameType", gameFilter);
        if (search.trim()) params.set("search", search.trim());
        params.set("limit", "24");

        fetch(`/api/tournaments?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                const nextTournaments: PublicTournamentCardData[] = (data.tournaments || []).map((tournament: TournamentResponse) => ({
                    ...tournament,
                    participantCount: tournament._count?.participants ?? 0,
                }));
                setTournaments(nextTournaments);
            })
            .catch(() => {
                setTournaments([]);
                setMessage("Kami belum dapat memuat daftar turnamen.");
            })
            .finally(() => setLoading(false));
    }, [statusFilter, gameFilter, search]);

    useEffect(() => () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    }, []);

    const headlineCount = useMemo(() => tournaments.length.toString().padStart(2, "0"), [tournaments.length]);
    const selectedStatusLabel = useMemo(
        () => statusOptions.find((option) => option.value === statusFilter)?.label ?? statusFilter,
        [statusFilter],
    );
    const selectedGameLabel = useMemo(
        () => gameOptions.find((option) => option.value === gameFilter)?.label ?? gameFilter.replace("_", " "),
        [gameFilter],
    );

    return (
        <main className="min-h-screen bg-[linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_100%)] text-slate-950 dark:bg-[linear-gradient(180deg,_#09090b_0%,_#101114_40%,_#151922_100%)] dark:text-white">
            <Navbar />
            <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top,rgba(255,201,22,0.18),transparent_28%),linear-gradient(180deg,#fffdf7,#f5f7fb)] pt-28 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(255,201,22,0.16),transparent_24%),radial-gradient(circle_at_right,rgba(56,189,248,0.12),transparent_26%),linear-gradient(180deg,#13151b,#0b0d12)]">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
                    <div>
                        <p className="mb-4 text-sm font-bold uppercase tracking-[0.34em] text-amber-600 dark:text-[#FFC916]">Direktori Turnamen</p>
                        <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
                            Semua turnamen Duel Standby, tersusun rapi dalam satu direktori.
                        </h1>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-white/60">
                            Temukan event yang relevan, bandingkan format serta hadiah, lalu masuk ke halaman detail saat Anda siap mengamankan slot.
                        </p>
                    </div>
                    <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.09)] dark:border-white/10 dark:bg-[#11161d] dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                        <div className="mb-4 text-sm uppercase tracking-[0.28em] text-slate-400 dark:text-white/35">Ringkasan Filter</div>
                        <div className="mb-2 text-6xl font-black text-amber-500 dark:text-[#FFC916]">{headlineCount}</div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">Hasil saat ini mengikuti pencarian aktif</div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-500 dark:text-white/55">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#161b23]">
                                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-white/30">Status</div>
                                <div>{selectedStatusLabel}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#161b23]">
                                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-white/30">Game</div>
                                <div>{selectedGameLabel}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8 grid gap-3 md:grid-cols-[1fr_180px_180px]">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            setSearchInput(nextValue);
                            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                            searchTimeoutRef.current = setTimeout(() => setSearch(nextValue), 250);
                        }}
                        placeholder="Cari nama turnamen atau kata kunci..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-[#FFC916] focus:ring-2 focus:ring-[#FFC916]/20 dark:border-white/10 dark:bg-[#11161d] dark:text-white dark:placeholder:text-white/28"
                    />
                    <FormSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
                    <FormSelect value={gameFilter} onChange={setGameFilter} options={gameOptions} />
                </div>

                {message ? (
                    <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                        {message}
                    </div>
                ) : null}

                {loading ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                            <div key={item} className="h-[420px] animate-pulse rounded-[28px] bg-slate-200/70 dark:bg-white/[0.05]" />
                        ))}
                    </div>
                ) : tournaments.length === 0 ? (
                    <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-20 text-center shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#11161d] dark:shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
                        <div className="mb-4 text-5xl text-amber-500 dark:text-[#FFC916]">[]</div>
                        <h2 className="text-2xl font-black text-slate-950 dark:text-white">Belum ada turnamen yang cocok dengan pencarian Anda.</h2>
                        <p className="mt-3 text-slate-500 dark:text-white/55">Ubah filter atau gunakan kata kunci lain untuk menemukan event yang tersedia.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {tournaments.map((tournament) => (
                            <PublicTournamentCard key={tournament.id} tournament={tournament} />
                        ))}
                    </div>
                )}
            </section>

            <Footer />
        </main>
    );
}
