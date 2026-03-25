"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/dashboard/toast";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar";
import { MatchChatThread } from "@/components/shared/match-chat-thread";
import { DateTimePickerInput } from "@/components/ui/date-time-picker";
import { useLocale } from "@/hooks/use-locale";
import { formatDateTime } from "@/lib/i18n/format";

type MatchParticipant = {
    id: string;
    name: string;
};

type MatchReport = {
    scoreA: number;
    scoreB: number;
    winnerId: string;
    evidenceUrls?: string[] | null;
};

type MatchSummary = {
    id: string;
    status: string;
    scheduledAt: string | null;
    scheduledAtLabel?: string | null;
    scheduledAtUtc?: string | null;
    playerA: MatchParticipant | null;
    playerB: MatchParticipant | null;
    report: MatchReport | null;
    hasOpenDispute: boolean;
    disputeReason?: string | null;
};

type AvailabilitySlot = {
    value: string;
    label: string;
};

type MatchAvailability = {
    id: string;
    status: "PENDING" | "SELECTED";
    slots: AvailabilitySlot[];
    selectedSlot: string | null;
    expiresAt: string;
    createdAt: string;
    proposedBy: { id: string; username: string | null; fullName: string | null };
    selectedBy: { id: string; username: string | null; fullName: string | null } | null;
};

type LineupRosterMember = {
    id: string;
    name: string;
    role: string;
};

type LineupTeam = {
    teamId: string;
    teamName: string;
    memberIds: string[];
    members: { id: string; name: string }[];
    submittedBy: { id: string; name: string } | null;
    updatedAt: string;
};

type LineupData = {
    enabled: boolean;
    lineupSize: number | null;
    locked: boolean;
    matchStatus: string;
    myTeamId: string | null;
    canSubmit: boolean;
    canStart: boolean;
    roster: LineupRosterMember[];
    lineups: LineupTeam[];
    opponentHidden?: boolean;
};

const MAX_EVIDENCE = 3;
const MAX_AVAILABILITY_SLOTS = 3;

const normalizeEvidence = (value?: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function EvidenceUploader({
    value,
    onChange,
    disabled,
}: {
    value: string[];
    onChange: (next: string[]) => void;
    disabled?: boolean;
}) {
    const { t } = useLocale();
    const { error } = useToast();
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (file: File) => {
        if (value.length >= MAX_EVIDENCE) {
            error(t.match.evidence.limit(MAX_EVIDENCE));
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || t.common.uploadFailed);
            }
            onChange([...value, data.url]);
        } catch (err) {
            err instanceof Error ? error(err.message) : error(t.common.uploadFailed);
        } finally {
            setUploading(false);
        }
    };

    const removeEvidence = (url: string) => {
        onChange(value.filter((item) => item !== url));
    };

    return (
        <div className="space-y-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-3 transition-all hover:border-primary/40 hover:bg-base-200/70">
                <span className="text-sm text-base-content/55">
                    {uploading ? t.match.evidence.uploading : t.match.evidence.add}
                </span>
                <span className="btn btn-primary btn-xs rounded-box">{t.common.upload}</span>
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleUpload(file);
                        event.currentTarget.value = "";
                    }}
                    disabled={disabled || uploading || value.length >= MAX_EVIDENCE}
                />
            </label>
            {value.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {value.map((url) => (
                        <div key={url} className="rounded-box border border-base-300 bg-base-100/70 p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={normalizeAssetUrl(url) || url}
                                alt={t.match.evidence.alt}
                                className="h-24 w-full rounded-box object-cover"
                            />
                            <button type="button" className="mt-2 text-xs text-error" onClick={() => removeEvidence(url)}>
                                {t.common.delete}
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}
            <div className="text-xs text-base-content/50">{t.match.evidence.limit(MAX_EVIDENCE)}</div>
        </div>
    );
}

export function TournamentMyMatch({
    match,
    currentUserId,
    tournamentTitle,
    tournamentUrl,
    tournamentTimeZone,
    lineupSize,
}: {
    match: MatchSummary;
    currentUserId?: string | null;
    tournamentTitle: string;
    tournamentUrl: string;
    tournamentTimeZone: string;
    lineupSize?: number | null;
}) {
    const { t, locale } = useLocale();
    const router = useRouter();
    const { success, error, warning } = useToast();
    const [scoreA, setScoreA] = useState(match.report?.scoreA ?? 0);
    const [scoreB, setScoreB] = useState(match.report?.scoreB ?? 0);
    const [winnerId, setWinnerId] = useState(match.report?.winnerId ?? "");
    const [reportEvidence, setReportEvidence] = useState<string[]>(normalizeEvidence(match.report?.evidenceUrls));
    const [reason, setReason] = useState(match.disputeReason ?? "");
    const [disputeEvidence, setDisputeEvidence] = useState<string[]>([]);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [submittingDispute, setSubmittingDispute] = useState(false);
    const [availability, setAvailability] = useState<MatchAvailability[]>([]);
    const [availabilitySlots, setAvailabilitySlots] = useState<string[]>([""]);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilitySubmitting, setAvailabilitySubmitting] = useState(false);
    const [selectingSlot, setSelectingSlot] = useState<string | null>(null);
    const [lineupData, setLineupData] = useState<LineupData | null>(null);
    const [lineupLoading, setLineupLoading] = useState(false);
    const [lineupSubmitting, setLineupSubmitting] = useState(false);
    const [startingMatch, setStartingMatch] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

    const winnerOptions = useMemo(() => {
        const options: Array<{ value: string; label: string }> = [];
        if (match.playerA) options.push({ value: match.playerA.id, label: match.playerA.name });
        if (match.playerB) options.push({ value: match.playerB.id, label: match.playerB.name });
        return options;
    }, [match.playerA, match.playerB]);

    const canReport = !["COMPLETED", "DISPUTED"].includes(match.status);
    const canDispute = !match.hasOpenDispute && match.status !== "COMPLETED";
    const readOnlyChat = match.status === "COMPLETED";
    const availabilityDisabled = match.status === "COMPLETED";
    const lineupEnabled = lineupSize !== null && lineupSize !== undefined;
    const lineupSizeValue = lineupData?.lineupSize ?? (lineupSize ?? null);

    const fetchAvailability = async () => {
        setAvailabilityLoading(true);
        try {
            const res = await fetch(`/api/matches/${match.id}/availability`);
            const data = await res.json();
            if (res.ok) {
                setAvailability(data.availabilities || []);
            } else {
                error(data.message || t.match.availability.errors.loadFailed);
            }
        } catch {
            error(t.common.networkError);
        } finally {
            setAvailabilityLoading(false);
        }
    };

    useEffect(() => {
        fetchAvailability();
    }, [match.id]);

    const fetchLineup = async () => {
        if (!lineupEnabled) return;
        setLineupLoading(true);
        try {
            const res = await fetch(`/api/matches/${match.id}/lineup`);
            const data = await res.json();
            if (res.ok) {
                setLineupData(data.data || null);
            } else {
                error(data.message || t.match.lineup.errors.loadFailed);
            }
        } catch {
            error(t.common.networkError);
        } finally {
            setLineupLoading(false);
        }
    };

    useEffect(() => {
        if (!lineupEnabled) return;
        fetchLineup();
    }, [match.id, lineupEnabled]);

    useEffect(() => {
        if (!lineupData?.enabled || !lineupData.myTeamId) return;
        const myLineup = lineupData.lineups.find((lineup) => lineup.teamId === lineupData.myTeamId);
        if (myLineup) {
            setSelectedMembers(myLineup.memberIds);
        } else {
            setSelectedMembers([]);
        }
    }, [lineupData]);

    const updateAvailabilitySlot = (index: number, value: string) => {
        setAvailabilitySlots((prev) => prev.map((slot, slotIndex) => (slotIndex === index ? value : slot)));
    };

    const addAvailabilitySlot = () => {
        setAvailabilitySlots((prev) => (prev.length < MAX_AVAILABILITY_SLOTS ? [...prev, ""] : prev));
    };

    const removeAvailabilitySlot = (index: number) => {
        setAvailabilitySlots((prev) => prev.filter((_, slotIndex) => slotIndex !== index));
    };

    const handleSubmitAvailability = async () => {
        if (availabilityDisabled) return;
        const slots = availabilitySlots.map((slot) => slot.trim()).filter(Boolean);
        if (slots.length === 0) {
            error(t.match.availability.errors.minSlots);
            return;
        }
        if (slots.length > MAX_AVAILABILITY_SLOTS) {
            error(t.match.availability.errors.maxSlots(MAX_AVAILABILITY_SLOTS));
            return;
        }
        setAvailabilitySubmitting(true);
        try {
            const res = await fetch(`/api/matches/${match.id}/availability`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slots }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || t.match.availability.errors.sendFailed);
            }
            success(data.message || t.match.availability.success.sent);
            setAvailabilitySlots([""]);
            fetchAvailability();
        } catch (err) {
            err instanceof Error ? error(err.message) : error(t.match.availability.errors.sendFailed);
        } finally {
            setAvailabilitySubmitting(false);
        }
    };

    const handleSelectSlot = async (availabilityId: string, slot: string) => {
        setSelectingSlot(availabilityId);
        try {
            const res = await fetch(`/api/matches/${match.id}/availability/${availabilityId}/select`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slot }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || t.match.availability.errors.selectFailed);
            }
            success(data.message || t.match.availability.success.selected);
            router.refresh();
            fetchAvailability();
        } catch (err) {
            err instanceof Error ? error(err.message) : error(t.match.availability.errors.selectFailed);
        } finally {
            setSelectingSlot(null);
        }
    };

    const toggleLineupMember = (memberId: string) => {
        if (!lineupSizeValue) return;
        setSelectedMembers((prev) => {
            if (prev.includes(memberId)) {
                return prev.filter((id) => id !== memberId);
            }
            if (prev.length >= lineupSizeValue) {
                warning(t.match.lineup.errors.maxPlayers(lineupSizeValue));
                return prev;
            }
            return [...prev, memberId];
        });
    };

    const handleSubmitLineup = async () => {
        if (!lineupSizeValue) return;
        if (selectedMembers.length !== lineupSizeValue) {
            warning(t.match.lineup.errors.mustPlayers(lineupSizeValue));
            return;
        }
        setLineupSubmitting(true);
        try {
            const res = await fetch(`/api/matches/${match.id}/lineup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberIds: selectedMembers }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || t.match.lineup.errors.saveFailed);
            }
            success(data.message || t.match.lineup.success.saved);
            router.refresh();
            fetchLineup();
        } catch (err) {
            err instanceof Error ? error(err.message) : error(t.match.lineup.errors.saveFailed);
        } finally {
            setLineupSubmitting(false);
        }
    };

    const handleStartMatch = async () => {
        setStartingMatch(true);
        try {
            const res = await fetch(`/api/matches/${match.id}/start`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || t.match.lineup.errors.startFailed);
            }
            success(data.message || t.match.lineup.success.started);
            router.refresh();
            fetchLineup();
        } catch (err) {
            err instanceof Error ? error(err.message) : error(t.match.lineup.errors.startFailed);
        } finally {
            setStartingMatch(false);
        }
    };

    const handleReport = async () => {
        if (!winnerId) {
            error(t.match.report.errors.winnerRequired);
            return;
        }
        setSubmittingReport(true);
        try {
            const res = await fetch(`/api/matches/${match.id}/report`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scoreA,
                    scoreB,
                    winnerId,
                    ...(reportEvidence.length ? { evidenceUrls: reportEvidence } : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || t.match.report.errors.sendFailed);
            }
            success(data.message || t.match.report.success.sent);
            router.refresh();
        } catch (err) {
            err instanceof Error ? error(err.message) : error(t.match.report.errors.sendFailed);
        } finally {
            setSubmittingReport(false);
        }
    };

    const handleDispute = async () => {
        setSubmittingDispute(true);
        try {
            const res = await fetch(`/api/matches/${match.id}/dispute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reason,
                    ...(disputeEvidence.length ? { evidenceUrls: disputeEvidence } : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || t.match.dispute.errors.sendFailed);
            }
            success(data.message || t.match.dispute.success.sent);
            router.refresh();
        } catch (err) {
            err instanceof Error ? error(err.message) : error(t.match.dispute.errors.sendFailed);
        } finally {
            setSubmittingDispute(false);
        }
    };

    const scheduledAtDate = match.scheduledAtUtc ? new Date(match.scheduledAtUtc) : null;
    const googleCalendarUrl = scheduledAtDate
        ? buildGoogleCalendarUrl({
              title: `Match ${match.playerA?.name ?? "TBD"} vs ${match.playerB?.name ?? "TBD"}`,
              start: scheduledAtDate,
              end: new Date(scheduledAtDate.getTime() + 60 * 60 * 1000),
              details: `Tournament: ${tournamentTitle}\n${tournamentUrl}`,
              timeZone: tournamentTimeZone,
          })
        : null;

    return (
        <div className="space-y-4">
            <div>
                <div className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-primary">{t.match.title}</div>
                <div className="rounded-box border border-base-300 bg-base-200/50 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 break-words font-semibold text-base-content">
                            {match.playerA?.name ?? t.match.tbd} vs {match.playerB?.name ?? t.match.tbd}
                        </div>
                        <span className="badge badge-outline">{match.status}</span>
                    </div>
                    <div className="mt-2 text-xs text-base-content/60">
                        {match.scheduledAtLabel || match.scheduledAt
                            ? t.match.scheduleLabel(match.scheduledAtLabel ?? match.scheduledAt ?? "")
                            : t.match.scheduleTbd}
                    </div>
                    {match.scheduledAt ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {googleCalendarUrl ? (
                                <a className={`${btnPrimary} btn-xs`} href={googleCalendarUrl} target="_blank" rel="noreferrer">
                                    {t.tournamentDetail.addToCalendar}
                                </a>
                            ) : null}
                            <a className={`${btnOutline} btn-xs`} href={`/api/matches/${match.id}/calendar`} target="_blank" rel="noreferrer">
                                {t.tournamentDetail.downloadIcs}
                            </a>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="rounded-box border border-base-300 bg-base-200/40 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/60">{t.match.availability.title}</div>
                        <p className="text-xs text-base-content/55">{t.match.availability.subtitle}</p>
                    </div>
                    <button type="button" className={`${btnOutline} btn-xs`} onClick={fetchAvailability} disabled={availabilityLoading}>
                        {t.common.refresh}
                    </button>
                </div>

                <div className="mt-3 space-y-3">
                    {availabilityLoading ? (
                        <div className="text-xs text-base-content/50">{t.match.availability.loading}</div>
                    ) : availability.length === 0 ? (
                        <div className="rounded-box border border-dashed border-base-300 p-3 text-center text-xs text-base-content/50">
                            {t.match.availability.empty}
                        </div>
                    ) : (
                        availability.map((item) => {
                            const proposerName = item.proposedBy.username || item.proposedBy.fullName || t.common.userFallback;
                            const isOwner = currentUserId && item.proposedBy.id === currentUserId;
                            const canSelect = !availabilityDisabled && !isOwner;
                            const expiresLabel = formatDateTime(item.expiresAt, locale);
                            return (
                                <div key={item.id} className="rounded-box border border-base-300 bg-base-100/70 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/60">
                                        <span>{t.match.availability.proposedBy(proposerName)}</span>
                                        <span>{t.match.availability.expires(expiresLabel)}</span>
                                    </div>
                                    {item.status === "SELECTED" && item.selectedSlot ? (
                                        <div className="mt-2 text-xs font-semibold text-success">
                                            {t.match.availability.selectedSlot(
                                                item.slots.find((slot) => slot.value === item.selectedSlot)?.label ?? item.selectedSlot
                                            )}
                                        </div>
                                    ) : null}
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {item.slots.map((slot) => (
                                            <button
                                                key={slot.value}
                                                type="button"
                                                className={`btn btn-xs ${canSelect ? "btn-outline" : "btn-ghost"}`}
                                                onClick={() => handleSelectSlot(item.id, slot.value)}
                                                disabled={!canSelect || selectingSlot === item.id}
                                            >
                                                {slot.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {!availabilityDisabled ? (
                    <div className="mt-4 space-y-3">
                        <div className="text-xs font-semibold text-base-content/70">{t.match.availability.sendTitle}</div>
                        <div className="space-y-2">
                            {availabilitySlots.map((slot, index) => (
                                <div key={`${index}-${slot}`} className="flex flex-wrap items-center gap-2">
                                    <DateTimePickerInput
                                        value={slot}
                                        onChange={(value) => updateAvailabilitySlot(index, value)}
                                        className="flex-1"
                                    />
                                    {availabilitySlots.length > 1 ? (
                                        <button type="button" className={`${btnOutline} btn-xs`} onClick={() => removeAvailabilitySlot(index)}>
                                            {t.common.delete}
                                        </button>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                        {availabilitySlots.length < MAX_AVAILABILITY_SLOTS ? (
                            <button type="button" className={`${btnOutline} btn-xs`} onClick={addAvailabilitySlot}>
                                {t.match.availability.addSlot}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className={`${btnPrimary} btn-sm`}
                            onClick={handleSubmitAvailability}
                            disabled={availabilitySubmitting}
                        >
                            {availabilitySubmitting ? t.match.availability.submitting : t.match.availability.submit}
                        </button>
                    </div>
                ) : (
                    <div className="mt-3 text-xs text-base-content/50">{t.match.availability.closed}</div>
                )}
            </div>

            {lineupEnabled ? (
                <div className="rounded-box border border-base-300 bg-base-200/40 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/60">{t.match.lineup.title}</div>
                            <p className="text-xs text-base-content/55">{t.match.lineup.subtitle}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" className={`${btnOutline} btn-xs`} onClick={fetchLineup} disabled={lineupLoading}>
                                {t.common.refresh}
                            </button>
                            {lineupData?.canStart ? (
                                <button type="button" className={`${btnPrimary} btn-xs`} onClick={handleStartMatch} disabled={startingMatch}>
                                    {startingMatch ? t.match.lineup.starting : t.match.lineup.startMatch}
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-3 space-y-3">
                        {lineupLoading ? (
                            <div className="text-xs text-base-content/50">{t.match.lineup.loading}</div>
                        ) : !lineupData ? (
                            <div className="rounded-box border border-dashed border-base-300 p-3 text-center text-xs text-base-content/50">
                                {t.match.lineup.empty}
                            </div>
                        ) : !lineupData.enabled ? (
                            <div className="rounded-box border border-dashed border-base-300 p-3 text-center text-xs text-base-content/50">
                                {t.match.lineup.disabled}
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/60">
                                    <span>{t.match.lineup.sizeLabel(lineupData.lineupSize ?? 0)}</span>
                                    <span className={`badge badge-outline ${lineupData.locked ? "badge-warning" : "badge-success"}`}>
                                        {lineupData.locked ? t.match.lineup.lockedBadge : t.match.lineup.draftBadge}
                                    </span>
                                </div>

                                {lineupData.lineups.length === 0 ? (
                                    <div className="rounded-box border border-dashed border-base-300 p-3 text-center text-xs text-base-content/50">
                                        {t.match.lineup.noneSubmitted}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {lineupData.lineups.map((lineup) => (
                                            <div key={lineup.teamId} className="rounded-box border border-base-300 bg-base-100/70 p-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="text-xs font-semibold text-base-content">{lineup.teamName}</div>
                                                    <div className="text-[11px] text-base-content/45">
                                                        {formatDateTime(lineup.updatedAt, locale)}
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-xs text-base-content/70">
                                                    {lineup.members.map((member) => member.name).join(", ")}
                                                </div>
                                                {lineup.submittedBy ? (
                                                    <div className="mt-2 text-[11px] text-base-content/45">
                                                        {t.match.lineup.submittedBy(lineup.submittedBy.name)}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {lineupData.opponentHidden ? (
                                    <div className="rounded-box border border-base-300 bg-base-100/70 p-3 text-xs text-base-content/55">
                                        {t.match.lineup.opponentHidden}
                                    </div>
                                ) : null}

                                {lineupData.canSubmit ? (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-base-content/70">
                                            <span>{t.match.lineup.pickTitle}</span>
                                            <span>
                                                {selectedMembers.length} / {lineupSizeValue ?? 0}
                                            </span>
                                        </div>
                                        {lineupData.roster.length === 0 ? (
                                            <div className="rounded-box border border-dashed border-base-300 p-3 text-center text-xs text-base-content/50">
                                                {t.match.lineup.rosterEmpty}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {lineupData.roster.map((member) => (
                                                    <label
                                                        key={member.id}
                                                        className="flex cursor-pointer items-center justify-between rounded-box border border-base-300 bg-base-100/70 px-3 py-2 text-xs text-base-content/70"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                className="checkbox checkbox-xs"
                                                                checked={selectedMembers.includes(member.id)}
                                                                onChange={() => toggleLineupMember(member.id)}
                                                                disabled={lineupSubmitting}
                                                            />
                                                            <span className="font-semibold text-base-content">{member.name}</span>
                                                        </span>
                                                        <span className="badge badge-ghost badge-xs">{member.role}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                            <button
                                                type="button"
                                                className={`${btnPrimary} w-full sm:w-auto`}
                                                onClick={handleSubmitLineup}
                                                disabled={lineupSubmitting}
                                            >
                                                {lineupSubmitting ? t.match.lineup.saving : t.match.lineup.save}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-base-content/55">
                                        {lineupData.locked ? t.match.lineup.lockedHint : t.match.lineup.captainOnly}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ) : null}

            <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">{t.match.report.title}</div>
                <div className="text-xs text-base-content/60">{t.match.report.subtitle}</div>
                {!canReport ? (
                    <div className="rounded-box border border-base-300 bg-base-200/40 p-3 text-xs text-base-content/60">
                        {t.match.report.disabled}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>{t.match.report.scoreA}</label>
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={scoreA}
                                    onChange={(event) => setScoreA(Number(event.target.value))}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t.match.report.scoreB}</label>
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
                            <label className={labelCls}>{t.match.report.winnerLabel}</label>
                            <select
                                className={inputCls}
                                value={winnerId}
                                onChange={(event) => setWinnerId(event.target.value)}
                            >
                                <option value="">{t.match.report.selectWinner}</option>
                                {winnerOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>{t.match.report.proofOptional}</label>
                            <EvidenceUploader value={reportEvidence} onChange={setReportEvidence} />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button className={`${btnPrimary} w-full sm:w-auto`} type="button" onClick={handleReport} disabled={submittingReport}>
                                {submittingReport ? t.match.report.submitting : t.match.report.submit}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="divider my-1" />

            <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">{t.match.dispute.title}</div>
                {!canDispute ? (
                    <div className="rounded-box border border-base-300 bg-base-200/40 p-3 text-xs text-base-content/60">
                        {match.hasOpenDispute ? t.match.dispute.processing : t.match.dispute.completed}
                    </div>
                ) : (
                    <>
                        <div>
                            <label className={labelCls}>{t.match.dispute.reasonOptional}</label>
                            <input
                                type="text"
                                className={inputCls}
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                placeholder={t.match.dispute.reasonPlaceholder}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t.match.dispute.proofOptional}</label>
                            <EvidenceUploader value={disputeEvidence} onChange={setDisputeEvidence} />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button className={`${btnOutline} w-full sm:w-auto`} type="button" onClick={handleDispute} disabled={submittingDispute}>
                                {submittingDispute ? t.match.dispute.submitting : t.match.dispute.submit}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="divider my-1" />

            <div className="rounded-box border border-base-300 bg-base-100/80 p-4">
                <MatchChatThread matchId={match.id} currentUserId={currentUserId} readOnly={readOnlyChat} />
            </div>
        </div>
    );
}

export default TournamentMyMatch;
