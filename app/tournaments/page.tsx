"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
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
                setMessage(null);
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
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
                    <div>
                        <p className="mb-4 text-sm font-bold uppercase tracking-[0.34em] text-primary">Direktori Turnamen</p>
                        <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
                            Semua turnamen Duel Standby, tersusun rapi dalam satu direktori.
                        </h1>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-base-content/65">
                            Temukan event yang relevan, bandingkan format serta hadiah, lalu masuk ke halaman detail saat Anda siap mengamankan slot.
                        </p>
                    </div>
                    <div className="card border border-base-300 bg-base-100/90 shadow-2xl">
                        <div className="card-body p-6">
                            <div className="mb-4 text-sm uppercase tracking-[0.28em] text-base-content/40">Ringkasan Filter</div>
                            <div className="mb-2 text-6xl font-black text-primary">{headlineCount}</div>
                            <div className="text-lg font-semibold text-base-content">Hasil saat ini mengikuti pencarian aktif</div>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-base-content/65">
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">Status</div>
                                    <div>{selectedStatusLabel}</div>
                                </div>
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">Game</div>
                                    <div>{selectedGameLabel}</div>
                                </div>
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
                        className="input input-bordered w-full bg-base-100"
                    />
                    <FormSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
                    <FormSelect value={gameFilter} onChange={setGameFilter} options={gameOptions} />
                </div>

                {message ? (
                    <div className="alert alert-error mb-6 rounded-box text-sm">
                        {message}
                    </div>
                ) : null}

                {loading ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                            <div key={item} className="skeleton h-[420px] rounded-[28px]" />
                        ))}
                    </div>
                ) : tournaments.length === 0 ? (
                    <div className="card border border-base-300 bg-base-100 shadow-xl">
                        <div className="card-body items-center px-6 py-20 text-center">
                            <div className="mb-4 text-5xl text-primary">[]</div>
                            <h2 className="text-2xl font-black text-base-content">Belum ada turnamen yang cocok dengan pencarian Anda.</h2>
                            <p className="mt-3 text-base-content/60">Ubah filter atau gunakan kata kunci lain untuk menemukan event yang tersedia.</p>
                        </div>
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
