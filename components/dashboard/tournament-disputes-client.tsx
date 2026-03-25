"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/dashboard/pagination";
import { Modal } from "@/components/dashboard/modal";
import { DashboardEmptyState, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { useToast } from "@/components/dashboard/toast";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { useLocale } from "@/hooks/use-locale";

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

function EvidencePreview({ urls, alt }: { urls: string[]; alt: string }) {
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
                            <img src={resolved} alt={alt} className="h-24 w-full rounded-box object-cover" />
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
    const { t } = useLocale();
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
        if (!participant) return t.match.tbd;
        return participant.user?.username || participant.user?.fullName || participant.guestName || t.match.tbd;
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
                error(t.dashboard.disputes.errors.loadFailed);
            }
        } catch {
            error(t.dashboard.disputes.errors.network);
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
                label: `${report.scoreA} - ${report.scoreB} · ${t.dashboard.matches.modal.winner}: ${winnerName}`,
                reporter,
                scoreA: report.scoreA,
                scoreB: report.scoreB,
                winnerId: report.winnerId,
                evidenceUrls: report.evidenceUrls ?? [],
            };
        });
    }, [activeMatch, t]);

    const openResolveModal = (match: MatchRow) => {
        setActiveMatch(match);
        setReason("");
        const firstReport = match.reports?.[0];
        setSelectedReportId(firstReport?.id || "");
        setResolutionEvidence([]);
    };

    const handleUploadEvidence = async (file: File) => {
        if (resolutionEvidence.length >= 3) {
            error(t.dashboard.disputes.maxEvidence(3));
            return;
        }
        setUploadingEvidence(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || t.dashboard.disputes.errors.uploadFailed);
            }
            setResolutionEvidence((prev) => [...prev, data.url]);
        } catch (err) {
            err instanceof Error ? error(err.message) : error(t.dashboard.disputes.errors.uploadFailed);
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
            error(t.dashboard.disputes.errors.selectReport);
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
                success(t.dashboard.disputes.success.resolved);
                setActiveMatch(null);
                fetchDisputes();
            } else {
                error(data.message || t.dashboard.disputes.errors.resolveFailed);
            }
        } catch {
            error(t.dashboard.disputes.errors.network);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.disputes.kicker}
                    title={t.dashboard.disputes.title}
                    description={t.dashboard.disputes.description}
                />

                <DashboardPanel title={t.dashboard.disputes.panelTitle} description={t.dashboard.disputes.panelDescription}>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((row) => (
                                <div key={row} className="h-16 animate-pulse rounded-box border border-base-300 bg-base-200/40" />
                            ))}
                        </div>
                    ) : matches.length === 0 ? (
                        <DashboardEmptyState
                            title={t.dashboard.disputes.emptyTitle}
                            description={t.dashboard.disputes.emptyDescription}
                        />
                    ) : (
                        <div className="space-y-3">
                            {matches.map((match) => (
                                <div key={match.id} className="rounded-box border border-base-300 bg-base-200/40 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="space-y-2">
                                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
                                                {t.dashboard.disputes.roundLabel(match.round.roundNumber)}
                                            </div>
                                            <div className="text-sm font-semibold text-base-content">
                                                {resolveParticipantName(match.playerA)} vs {resolveParticipantName(match.playerB)}
                                            </div>
                                            <div className="text-xs text-base-content/55">
                                                {match.disputes?.[0]?.reason
                                                    ? `${t.dashboard.disputes.reasonLabel}: ${match.disputes[0].reason}`
                                                    : `${t.dashboard.disputes.reasonLabel}: ${t.dashboard.disputes.reasonFallback}`}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="badge badge-outline text-warning">{t.dashboard.disputes.needsDecision}</span>
                                            <span className="badge badge-outline">{match.status}</span>
                                            <button className={`${btnOutline} btn-sm`} onClick={() => openResolveModal(match)}>
                                                {t.dashboard.disputes.resolve}
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

            <Modal open={Boolean(activeMatch)} onClose={() => setActiveMatch(null)} title={t.dashboard.disputes.modalTitle} size="md">
                {activeMatch ? (
                    <div className="space-y-4">
                        <div className="text-sm text-base-content/70">
                            {resolveParticipantName(activeMatch.playerA)} vs {resolveParticipantName(activeMatch.playerB)}
                        </div>

                        {reportOptions.length === 0 ? (
                            <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-6 text-center text-sm text-base-content/60">
                                {t.dashboard.disputes.noReports}
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
                                            <div className="text-xs text-base-content/50">{t.dashboard.disputes.reportedBy(option.reporter)}</div>
                                            {option.evidenceUrls?.length ? <EvidencePreview urls={option.evidenceUrls} alt={t.dashboard.disputes.evidenceMatchAlt} /> : null}
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
                                <label className={labelCls}>{t.dashboard.disputes.evidenceDispute}</label>
                                <EvidencePreview urls={activeMatch.disputes[0].evidenceUrls ?? []} alt={t.dashboard.disputes.evidenceDispute} />
                            </div>
                        ) : null}

                        <div>
                            <label className={labelCls}>{t.dashboard.disputes.evidenceResolution}</label>
                            <div className="space-y-2">
                                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-3 transition-all hover:border-primary/40 hover:bg-base-200/70">
                                    <span className="text-sm text-base-content/55">
                                        {uploadingEvidence ? t.match.evidence.uploading : t.dashboard.disputes.addEvidence}
                                    </span>
                                    <span className="btn btn-primary btn-xs rounded-box">{t.dashboard.disputes.upload}</span>
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
                                                <img src={resolveEvidenceUrl(url)} alt={t.dashboard.disputes.evidenceDispute} className="h-24 w-full rounded-box object-cover" />
                                                <button type="button" className="mt-2 text-xs text-error" onClick={() => removeResolutionEvidence(url)}>
                                                    {t.dashboard.disputes.remove}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                <div className="text-xs text-base-content/50">{t.dashboard.disputes.maxEvidence(3)}</div>
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>{t.dashboard.disputes.noteLabel}</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                placeholder={t.dashboard.disputes.notePlaceholder}
                                className={inputCls}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button className={btnOutline} type="button" onClick={() => setActiveMatch(null)}>
                                {t.dashboard.disputes.buttons.cancel}
                            </button>
                            <button className={btnPrimary} type="button" onClick={handleResolve} disabled={submitting || reportOptions.length === 0}>
                                {submitting ? t.dashboard.disputes.buttons.saving : t.dashboard.disputes.buttons.resolve}
                            </button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </DashboardPageShell>
    );
}
