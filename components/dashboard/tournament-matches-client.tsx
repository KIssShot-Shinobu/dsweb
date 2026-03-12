"use client";

import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { FormSelect } from "@/components/dashboard/form-select";
import { DashboardEmptyState, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";

type MatchRow = {
    id: string;
    bracketIndex: number;
    status: string;
    scoreA: number | null;
    scoreB: number | null;
    round: { roundNumber: number; type: string };
    playerA: { id: string; fullName: string } | null;
    playerB: { id: string; fullName: string } | null;
    winner: { id: string; fullName: string } | null;
};

type MatchResponse = {
    matches: MatchRow[];
    total: number;
    page: number;
    limit: number;
};

const STATUS_OPTIONS = [
    { value: "ALL", label: "Semua Status" },
    { value: "PENDING", label: "PENDING" },
    { value: "READY", label: "READY" },
    { value: "ONGOING", label: "ONGOING" },
    { value: "RESULT_SUBMITTED", label: "RESULT SUBMITTED" },
    { value: "CONFIRMED", label: "CONFIRMED" },
    { value: "DISPUTED", label: "DISPUTED" },
    { value: "COMPLETED", label: "COMPLETED" },
] as const;

const PER_PAGE = 20;

export function TournamentMatchesClient({ tournamentId }: { tournamentId: string }) {
    const { success, error } = useToast();
    const [matches, setMatches] = useState<MatchRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [activeMatch, setActiveMatch] = useState<MatchRow | null>(null);
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [winnerId, setWinnerId] = useState("");

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(PER_PAGE),
            });
            if (statusFilter !== "ALL") params.set("status", statusFilter);
            const res = await fetch(`/api/tournaments/${tournamentId}/matches?${params.toString()}`);
            const data = (await res.json()) as { success: boolean } & MatchResponse;
            if (res.ok) {
                setMatches(data.matches);
                setTotal(data.total);
            } else {
                error("Gagal memuat daftar match.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
    }, [page, statusFilter]);

    const openMatchModal = (match: MatchRow) => {
        setActiveMatch(match);
        setScoreA(match.scoreA ?? 0);
        setScoreB(match.scoreB ?? 0);
        setWinnerId(match.winner?.id ?? "");
    };

    const winnerOptions = useMemo(() => {
        if (!activeMatch) return [];
        const options = [];
        if (activeMatch.playerA) options.push({ value: activeMatch.playerA.id, label: activeMatch.playerA.fullName });
        if (activeMatch.playerB) options.push({ value: activeMatch.playerB.id, label: activeMatch.playerB.fullName });
        return options;
    }, [activeMatch]);

    const handleResolve = async () => {
        if (!activeMatch) return;
        if (!winnerId) {
            error("Pilih pemenang terlebih dahulu.");
            return;
        }

        try {
            const res = await fetch(`/api/matches/${activeMatch.id}/admin-resolve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    winnerId,
                    scoreA,
                    scoreB,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                success("Hasil match diperbarui.");
                setActiveMatch(null);
                fetchMatches();
            } else {
                error(data.message || "Gagal mengubah hasil match.");
            }
        } catch {
            error("Kesalahan jaringan.");
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker="Matches"
                    title="Daftar Match"
                    description="Kelola hasil pertandingan, set pemenang, dan monitor status."
                    actions={
                        <FormSelect
                            value={statusFilter}
                            onChange={(value) => {
                                setStatusFilter(value);
                                setPage(1);
                            }}
                            options={STATUS_OPTIONS}
                            className="w-full sm:w-48"
                        />
                    }
                />

                <DashboardPanel title="Match List" description="Klik action untuk mengatur hasil pertandingan.">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((row) => (
                                <div key={row} className="h-16 animate-pulse rounded-box border border-base-300 bg-base-200/40" />
                            ))}
                        </div>
                    ) : matches.length === 0 ? (
                        <DashboardEmptyState
                            title="Belum ada match"
                            description="Match akan muncul setelah bracket dibuat."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Round</th>
                                        <th>Player 1</th>
                                        <th>Player 2</th>
                                        <th>Score</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matches.map((match) => (
                                        <tr key={match.id}>
                                            <td className="text-sm text-base-content/70">R{match.round.roundNumber}</td>
                                            <td className="text-sm font-semibold text-base-content">{match.playerA?.fullName || "TBD"}</td>
                                            <td className="text-sm font-semibold text-base-content">{match.playerB?.fullName || "TBD"}</td>
                                            <td className="text-sm text-base-content/70">
                                                {match.scoreA ?? 0} - {match.scoreB ?? 0}
                                            </td>
                                            <td>
                                                <span className="badge badge-outline">{match.status}</span>
                                            </td>
                                            <td className="text-right">
                                                <button className={`${btnOutline} btn-xs`} onClick={() => openMatchModal(match)}>
                                                    Edit Result
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {matches.length > 0 ? (
                        <div className="mt-4">
                            <Pagination page={page} totalPages={totalPages} total={total} perPage={PER_PAGE} onPage={setPage} />
                        </div>
                    ) : null}
                </DashboardPanel>
            </div>

            <Modal open={Boolean(activeMatch)} onClose={() => setActiveMatch(null)} title="Atur Hasil Match">
                {activeMatch ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Score Player 1</label>
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={scoreA}
                                    onChange={(event) => setScoreA(Number(event.target.value))}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Score Player 2</label>
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={scoreB}
                                    onChange={(event) => setScoreB(Number(event.target.value))}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Winner</label>
                            <FormSelect value={winnerId} onChange={setWinnerId} options={winnerOptions} placeholder="Pilih pemenang" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button className={btnOutline} type="button" onClick={() => setActiveMatch(null)}>
                                Batal
                            </button>
                            <button className={btnPrimary} type="button" onClick={handleResolve}>
                                Simpan
                            </button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </DashboardPageShell>
    );
}
