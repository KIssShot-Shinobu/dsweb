"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { DashboardEmptyState, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";
import { normalizeAssetUrl } from "@/lib/asset-url";

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
    evidenceUrls?: string[] | null;
    reportedBy: { id: string; fullName: string | null; username: string | null } | null;
};

type MatchDispute = {
    id: string;
    status: string;
    reason: string | null;
    raisedById: string;
    createdAt: string;
    evidenceUrls?: string[] | null;
    resolutionNote?: string | null;
    resolutionEvidenceUrls?: string[] | null;
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

const resolveEvidenceUrl = (url: string) => (url.startsWith("/uploads/") ? normalizeAssetUrl(url) || url : url);
const isImageEvidence = (url: string) => /\.(png|jpe?g|webp|gif)$/i.test(url) || url.startsWith("/uploads/");

function EvidencePreview({ urls }: { urls: string[] }) {
    if (urls.length === 0) return null;
    return (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {urls.map((url, index) => {
                const resolved = resolveEvidenceUrl(url);
                const isImage = isImageEvidence(url);
                return (
                    <a
                        key={`${url}-${index}`}
                        href={resolved}
                        target="_blank"
                        rel="noreferrer"
                        className="group rounded-box border border-base-300 bg-base-100/70 p-2 text-xs text-base-content/70 hover:border-primary/40"
                    >
                        {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolved} alt="Bukti match" className="h-24 w-full rounded-box object-cover" />
                        ) : (
                            <div className="line-clamp-2 break-all text-[11px]">{resolved}</div>
                        )}
                    </a>
                );
            })}
        </div>
    );
}

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
    const [resolutionEvidence, setResolutionEvidence] = useState<string[]>([]);
    const [uploadingEvidence, setUploadingEvidence] = useState(false);

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    const resolveParticipantName = (participant?: MatchParticipant | null) => {
        if (!participant) return "TBD";
        return participant.user?.username || participant.user?.fullName || participant.guestName || "TBD";
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
            const reporter = report.reportedBy?.username || report.reportedBy?.fullName || report.reportedById.slice(-6);
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
                evidenceUrls: report.evidenceUrls ?? [],
            };
        });
    }, [activeMatch]);

    const openResolveModal = (match: MatchRow) => {
        setActiveMatch(match);
        setReason("");
        const firstReport = match.reports?.[0];
        setSelectedReportId(firstReport?.id || "");
        setResolutionEvidence([]);
    };

    const handleUploadEvidence = async (file: File) => {
        if (resolutionEvidence.length >= 3) {
            error("Maksimal 3 bukti.");
            return;
        }
        setUploadingEvidence(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Upload gagal.");
            }
            setResolutionEvidence((prev) => [...prev, data.url]);
        } catch (err) {
            err instanceof Error ? error(err.message) : error("Upload gagal.");
        } finally {
            setUploadingEvidence(false);
        }
    };

    const removeResolutionEvidence = (url: string) => {
        setResolutionEvidence((prev) => prev.filter((item) => item !== url));
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
                    ...(resolutionEvidence.length ? { evidenceUrls: resolutionEvidence } : {}),
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
                                    <label
                                        key={option.id}
                                        className="flex cursor-pointer flex-col items-start gap-3 rounded-box border border-base-300 bg-base-200/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-base-content">{option.label}</div>
                                            <div className="text-xs text-base-content/50">Dilaporkan oleh {option.reporter}</div>
                                            {option.evidenceUrls?.length ? <EvidencePreview urls={option.evidenceUrls} /> : null}
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

                        {activeMatch.disputes?.[0]?.evidenceUrls?.length ? (
                            <div>
                                <label className={labelCls}>Bukti Sengketa</label>
                                <EvidencePreview urls={activeMatch.disputes[0].evidenceUrls ?? []} />
                            </div>
                        ) : null}

                        <div>
                            <label className={labelCls}>Bukti Resolusi (opsional)</label>
                            <div className="space-y-2">
                                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-3 transition-all hover:border-primary/40 hover:bg-base-200/70">
                                    <span className="text-sm text-base-content/55">
                                        {uploadingEvidence ? "Mengunggah file..." : "Tambah bukti (PNG/JPG/WEBP)"}
                                    </span>
                                    <span className="btn btn-primary btn-xs rounded-box">Upload</span>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (file) handleUploadEvidence(file);
                                            event.currentTarget.value = "";
                                        }}
                                        disabled={uploadingEvidence || resolutionEvidence.length >= 3}
                                    />
                                </label>
                                {resolutionEvidence.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {resolutionEvidence.map((url) => (
                                            <div key={url} className="rounded-box border border-base-300 bg-base-100/70 p-2">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={resolveEvidenceUrl(url)} alt="Bukti resolusi" className="h-24 w-full rounded-box object-cover" />
                                                <button type="button" className="mt-2 text-xs text-error" onClick={() => removeResolutionEvidence(url)}>
                                                    Hapus
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                <div className="text-xs text-base-content/50">Maksimal 3 bukti.</div>
                            </div>
                        </div>

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
