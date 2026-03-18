"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { DashboardEmptyState, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";

type MatchParticipant = {
    id: string;
    guestName: string | null;
    user: { id: string; fullName: string | null; username: string | null } | null;
};

type MatchReport = {
    id: string;
    reportedById: string;
    scoreA: number;
    scoreB: number;
    winnerId: string;
    createdAt: string;
    reportedBy: { id: string; fullName: string | null; username: string | null } | null;
};

type MatchDispute = {
    id: string;
    status: string;
    reason: string | null;
    raisedById: string;
    createdAt: string;
    raisedBy: { id: string; fullName: string | null; username: string | null } | null;
};

type MatchRow = {
    id: string;
    bracketIndex: number;
    status: string;
    scoreA: number | null;
    scoreB: number | null;
    round: { roundNumber: number; type: string };
    playerA: MatchParticipant | null;
    playerB: MatchParticipant | null;
    winner: MatchParticipant | null;
    reports?: MatchReport[];
    disputes?: MatchDispute[];
};

type MatchResponse = {
    matches: MatchRow[];
    total: number;
    page: number;
    limit: number;
};

const PER_PAGE = 20;

export function TournamentDisputesClient({ tournamentId }: { tournamentId: string }) {
    const { success, error } = useToast();
    const [matches, setMatches] = useState<MatchRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [activeMatch, setActiveMatch] = useState<MatchRow | null>(null);
    const [selectedReportId, setSelectedReportId] = useState<string>("");
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    const resolveParticipantName = (participant?: MatchParticipant | null) => {
        if (!participant) return "TBD";
        return participant.user?.fullName || participant.user?.username || participant.guestName || "TBD";
    };

    const fetchDisputes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(PER_PAGE),
                status: "DISPUTED",
                includeReports: "1",
            });
            const res = await fetch(`/api/tournaments/${tournamentId}/matches?${params.toString()}`);
            const data = (await res.json()) as { success: boolean } & MatchResponse;
            if (res.ok) {
                setMatches(data.matches || []);
                setTotal(data.total || 0);
            } else {
                error("Gagal memuat sengketa match.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setLoading(false);
        }
    }, [error, page, tournamentId]);

    useEffect(() => {
        fetchDisputes();
    }, [fetchDisputes]);

    const reportOptions = useMemo(() => {
        if (!activeMatch?.reports) return [];
        return activeMatch.reports.map((report) => {
            const reporter = report.reportedBy?.fullName || report.reportedBy?.username || report.reportedById.slice(-6);
            const winnerName = report.winnerId === activeMatch.playerA?.id
                ? resolveParticipantName(activeMatch.playerA)
                : report.winnerId === activeMatch.playerB?.id
                    ? resolveParticipantName(activeMatch.playerB)
                    : "TBD";
            return {
                id: report.id,
                label: `${report.scoreA} - ${report.scoreB} · Winner: ${winnerName}`,
                reporter,
                scoreA: report.scoreA,
                scoreB: report.scoreB,
                winnerId: report.winnerId,
            };
        });
    }, [activeMatch]);

    const openResolveModal = (match: MatchRow) => {
        setActiveMatch(match);
        setReason("");
        const firstReport = match.reports?.[0];
        setSelectedReportId(firstReport?.id || "");
    };

    const handleResolve = async () => {
        if (!activeMatch) return;
        const selected = reportOptions.find((option) => option.id === selectedReportId);
        if (!selected) {
            error("Pilih laporan yang akan dikonfirmasi.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/matches/${activeMatch.id}/resolve-dispute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scoreA: selected.scoreA,
                    scoreB: selected.scoreB,
                    winnerId: selected.winnerId,
                    reason,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                success("Sengketa berhasil diselesaikan.");
                setActiveMatch(null);
                fetchDisputes();
            } else {
                error(data.message || "Gagal menyelesaikan sengketa.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker="Dispute Queue"
                    title="Sengketa Match"
                    description="Prioritaskan match yang perlu keputusan cepat dari referee."
                />

                <DashboardPanel title="Daftar Sengketa" description="Match dengan laporan berbeda akan muncul di sini.">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((row) => (
                                <div key={row} className="h-16 animate-pulse rounded-box border border-base-300 bg-base-200/40" />
                            ))}
                        </div>
                    ) : matches.length === 0 ? (
                        <DashboardEmptyState
                            title="Belum ada sengketa"
                            description="Semua match berjalan normal tanpa dispute."
                        />
                    ) : (
                        <div className="space-y-3">
                            {matches.map((match) => (
                                <div key={match.id} className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="space-y-2">
                                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
                                                Round {match.round.roundNumber}
                                            </div>
                                            <div className="text-sm font-semibold text-base-content">
                                                {resolveParticipantName(match.playerA)} vs {resolveParticipantName(match.playerB)}
                                            </div>
                                            <div className="text-xs text-base-content/55">
                                                {match.disputes?.[0]?.reason ? `Alasan: ${match.disputes[0].reason}` : "Alasan: Perbedaan laporan skor"}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="badge badge-outline text-warning">Needs Decision</span>
                                            <span className="badge badge-outline">{match.status}</span>
                                            <button className={`${btnOutline} btn-sm`} onClick={() => openResolveModal(match)}>
                                                Resolve
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {matches.length > 0 ? (
                        <div className="mt-4">
                            <Pagination page={page} totalPages={totalPages} total={total} perPage={PER_PAGE} onPage={setPage} />
                        </div>
                    ) : null}
                </DashboardPanel>
            </div>

            <Modal open={Boolean(activeMatch)} onClose={() => setActiveMatch(null)} title="Resolve Sengketa" size="md">
                {activeMatch ? (
                    <div className="space-y-4">
                        <div className="text-sm text-base-content/70">
                            {resolveParticipantName(activeMatch.playerA)} vs {resolveParticipantName(activeMatch.playerB)}
                        </div>

                        {reportOptions.length === 0 ? (
                            <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-6 text-center text-sm text-base-content/60">
                                Laporan belum tersedia.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {reportOptions.map((option) => (
                                    <label key={option.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-box border border-base-300 bg-base-200/40 px-3 py-2">
                                        <div>
                                            <div className="text-sm font-semibold text-base-content">{option.label}</div>
                                            <div className="text-xs text-base-content/50">Dilaporkan oleh {option.reporter}</div>
                                        </div>
                                        <input
                                            type="radio"
                                            name="report"
                                            className="radio radio-primary"
                                            checked={selectedReportId === option.id}
                                            onChange={() => setSelectedReportId(option.id)}
                                        />
                                    </label>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className={labelCls}>Catatan Referee (opsional)</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                placeholder="Contoh: bukti screenshot valid"
                                className={inputCls}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button className={btnOutline} type="button" onClick={() => setActiveMatch(null)}>
                                Batal
                            </button>
                            <button className={btnPrimary} type="button" onClick={handleResolve} disabled={submitting || reportOptions.length === 0}>
                                {submitting ? "Menyimpan..." : "Selesaikan"}
                            </button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </DashboardPageShell>
    );
}
