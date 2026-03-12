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
    const [pageSize, setPageSize] = useState("6");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [message, setMessage] = useState<string | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const perPage = useMemo(() => {
        const parsed = parseInt(pageSize, 10);
        return Number.isNaN(parsed) ? 6 : parsed;
    }, [pageSize]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter, gameFilter, search, perPage]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (gameFilter !== "ALL") params.set("gameType", gameFilter);
        if (search.trim()) params.set("search", search.trim());
        params.set("page", String(page));
        params.set("limit", String(perPage));

        fetch(`/api/tournaments?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                const nextTournaments: PublicTournamentCardData[] = (data.tournaments || []).map((tournament: TournamentResponse) => ({
                    ...tournament,
                    participantCount: tournament._count?.participants ?? 0,
                }));
                setTournaments(nextTournaments);
                setTotal(data.total || 0);
                setMessage(null);
            })
            .catch(() => {
                setTournaments([]);
                setTotal(0);
                setMessage("Kami belum dapat memuat daftar turnamen.");
            })
            .finally(() => setLoading(false));
    }, [statusFilter, gameFilter, search, page, perPage]);

    useEffect(() => () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    }, []);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

    const pageOptions = [
        { value: "6", label: "6 / halaman" },
        { value: "12", label: "12 / halaman" },
        { value: "18", label: "18 / halaman" },
    ];

    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto max-w-[1400px] px-4 pb-14 sm:px-6 lg:px-8">
                    <p className="mb-4 text-sm font-bold uppercase tracking-[0.34em] text-primary">Direktori Turnamen</p>
                    <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                        Semua turnamen Duel Standby, tersusun rapi dalam satu direktori.
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-base-content/65 sm:text-base">
                        Temukan event yang relevan, bandingkan format serta hadiah, lalu masuk ke halaman detail saat Anda siap mengamankan slot.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
                <div className="mb-8 grid gap-3 sm:gap-4 md:grid-cols-[1fr_180px_180px_160px] md:items-center">
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
                    <FormSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} className="md:min-w-[180px]" />
                    <FormSelect value={gameFilter} onChange={setGameFilter} options={gameOptions} className="md:min-w-[180px]" />
                    <FormSelect value={pageSize} onChange={setPageSize} options={pageOptions} className="md:min-w-[160px]" />
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
                            <h2 className="text-xl font-black text-base-content sm:text-2xl">Belum ada turnamen yang cocok dengan pencarian Anda.</h2>
                            <p className="mt-3 text-sm text-base-content/60 sm:text-base">Ubah filter atau gunakan kata kunci lain untuk menemukan event yang tersedia.</p>
                        </div>
                    </div>
                ) : (
                    <>
                    <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {tournaments.map((tournament) => (
                            <PublicTournamentCard key={tournament.id} tournament={tournament} />
                        ))}
                    </div>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-base-content/60 sm:text-sm">
                                Menampilkan {tournaments.length} dari {total} turnamen.
                            </div>
                            <div className="join">
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm join-item"
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                                    disabled={page <= 1}
                                >
                                    Prev
                                </button>
                                <button type="button" className="btn btn-ghost btn-sm join-item pointer-events-none">
                                    {page} / {totalPages}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm join-item"
                                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                                    disabled={page >= totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            <Footer />
        </main>
    );
}
