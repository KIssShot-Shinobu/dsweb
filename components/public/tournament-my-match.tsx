"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/dashboard/toast";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar";
import { MatchChatThread } from "@/components/shared/match-chat-thread";
import { DateTimePickerInput } from "@/components/ui/date-time-picker";

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
    const { error } = useToast();
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (file: File) => {
        if (value.length >= MAX_EVIDENCE) {
            error("Maksimal 3 bukti.");
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Upload gagal.");
            }
            onChange([...value, data.url]);
        } catch (err) {
            err instanceof Error ? error(err.message) : error("Upload gagal.");
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
                    {uploading ? "Mengunggah file..." : "Tambah bukti (PNG/JPG/WEBP)"}
                </span>
                <span className="btn btn-primary btn-xs rounded-box">Upload</span>
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
                            <img src={normalizeAssetUrl(url) || url} alt="Bukti match" className="h-24 w-full rounded-box object-cover" />
                            <button type="button" className="mt-2 text-xs text-error" onClick={() => removeEvidence(url)}>
                                Hapus
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}
            <div className="text-xs text-base-content/50">Maksimal {MAX_EVIDENCE} bukti.</div>
        </div>
    );
}

export function TournamentMyMatch({
    match,
    currentUserId,
    tournamentTitle,
    tournamentUrl,
    tournamentTimeZone,
}: {
    match: MatchSummary;
    currentUserId?: string | null;
    tournamentTitle: string;
    tournamentUrl: string;
    tournamentTimeZone: string;
}) {
    const router = useRouter();
    const { success, error } = useToast();
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

    const fetchAvailability = async () => {
        setAvailabilityLoading(true);
        try {
            const res = await fetch(`/api/matches/${match.id}/availability`);
            const data = await res.json();
            if (res.ok) {
                setAvailability(data.availabilities || []);
            } else {
                error(data.message || "Gagal memuat availability.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setAvailabilityLoading(false);
        }
    };

    useEffect(() => {
        fetchAvailability();
    }, [match.id]);

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
            error("Isi minimal 1 slot ketersediaan.");
            return;
        }
        if (slots.length > MAX_AVAILABILITY_SLOTS) {
            error("Maksimal 3 slot ketersediaan.");
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
                throw new Error(data.message || "Gagal mengirim availability.");
            }
            success(data.message || "Slot jadwal berhasil dikirim.");
            setAvailabilitySlots([""]);
            fetchAvailability();
        } catch (err) {
            err instanceof Error ? error(err.message) : error("Gagal mengirim availability.");
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
                throw new Error(data.message || "Gagal memilih slot.");
            }
            success(data.message || "Slot jadwal dipilih.");
            router.refresh();
            fetchAvailability();
        } catch (err) {
            err instanceof Error ? error(err.message) : error("Gagal memilih slot.");
        } finally {
            setSelectingSlot(null);
        }
    };

    const handleReport = async () => {
        if (!winnerId) {
            error("Pilih pemenang terlebih dahulu.");
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
                throw new Error(data.message || "Gagal mengirim laporan match.");
            }
            success(data.message || "Laporan match terkirim.");
            router.refresh();
        } catch (err) {
            err instanceof Error ? error(err.message) : error("Gagal mengirim laporan match.");
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
                throw new Error(data.message || "Gagal mengajukan sengketa.");
            }
            success(data.message || "Sengketa berhasil diajukan.");
            router.refresh();
        } catch (err) {
            err instanceof Error ? error(err.message) : error("Gagal mengajukan sengketa.");
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
                <div className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-primary">Match Anda</div>
                <div className="rounded-box border border-base-300 bg-base-200/50 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 break-words font-semibold text-base-content">
                            {match.playerA?.name ?? "TBD"} vs {match.playerB?.name ?? "TBD"}
                        </div>
                        <span className="badge badge-outline">{match.status}</span>
                    </div>
                    <div className="mt-2 text-xs text-base-content/60">
                        {match.scheduledAtLabel || match.scheduledAt ? `Jadwal: ${match.scheduledAtLabel ?? match.scheduledAt}` : "Jadwal belum ditentukan."}
                    </div>
                    {match.scheduledAt ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {googleCalendarUrl ? (
                                <a className={`${btnPrimary} btn-xs`} href={googleCalendarUrl} target="_blank" rel="noreferrer">
                                    Add to Google Calendar
                                </a>
                            ) : null}
                            <a className={`${btnOutline} btn-xs`} href={`/api/matches/${match.id}/calendar`} target="_blank" rel="noreferrer">
                                Download ICS
                            </a>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="rounded-box border border-base-300 bg-base-200/40 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/60">Availability</div>
                        <p className="text-xs text-base-content/55">Usulkan 1-3 slot jadwal, lawan memilih.</p>
                    </div>
                    <button type="button" className={`${btnOutline} btn-xs`} onClick={fetchAvailability} disabled={availabilityLoading}>
                        Refresh
                    </button>
                </div>

                <div className="mt-3 space-y-3">
                    {availabilityLoading ? (
                        <div className="text-xs text-base-content/50">Memuat availability...</div>
                    ) : availability.length === 0 ? (
                        <div className="rounded-box border border-dashed border-base-300 p-3 text-center text-xs text-base-content/50">
                            Belum ada slot ketersediaan.
                        </div>
                    ) : (
                        availability.map((item) => {
                            const proposerName = item.proposedBy.username || item.proposedBy.fullName || "User";
                            const isOwner = currentUserId && item.proposedBy.id === currentUserId;
                            const canSelect = !availabilityDisabled && !isOwner;
                            const expiresLabel = new Date(item.expiresAt).toLocaleString("id-ID");
                            return (
                                <div key={item.id} className="rounded-box border border-base-300 bg-base-100/70 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/60">
                                        <span>Usulan dari {proposerName}</span>
                                        <span>Expired: {expiresLabel}</span>
                                    </div>
                                    {item.status === "SELECTED" && item.selectedSlot ? (
                                        <div className="mt-2 text-xs font-semibold text-success">
                                            Slot dipilih: {item.slots.find((slot) => slot.value === item.selectedSlot)?.label ?? item.selectedSlot}
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
                        <div className="text-xs font-semibold text-base-content/70">Kirim slot baru</div>
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
                                            Hapus
                                        </button>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                        {availabilitySlots.length < MAX_AVAILABILITY_SLOTS ? (
                            <button type="button" className={`${btnOutline} btn-xs`} onClick={addAvailabilitySlot}>
                                Tambah Slot
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className={`${btnPrimary} btn-sm`}
                            onClick={handleSubmitAvailability}
                            disabled={availabilitySubmitting}
                        >
                            {availabilitySubmitting ? "Mengirim..." : "Kirim Availability"}
                        </button>
                    </div>
                ) : (
                    <div className="mt-3 text-xs text-base-content/50">Match sudah selesai. Availability ditutup.</div>
                )}
            </div>

            <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">Report Match</div>
                <div className="text-xs text-base-content/60">
                    Auto-confirm 24 jam jika lawan tidak merespons laporan hasil.
                </div>
                {!canReport ? (
                    <div className="rounded-box border border-base-300 bg-base-200/40 p-3 text-xs text-base-content/60">
                        Match sedang dalam sengketa atau sudah selesai.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Score Player A</label>
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={scoreA}
                                    onChange={(event) => setScoreA(Number(event.target.value))}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Score Player B</label>
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
                            <label className={labelCls}>Pemenang</label>
                            <select
                                className={inputCls}
                                value={winnerId}
                                onChange={(event) => setWinnerId(event.target.value)}
                            >
                                <option value="">Pilih pemenang</option>
                                {winnerOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Bukti Laporan (opsional)</label>
                            <EvidenceUploader value={reportEvidence} onChange={setReportEvidence} />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button className={`${btnPrimary} w-full sm:w-auto`} type="button" onClick={handleReport} disabled={submittingReport}>
                                {submittingReport ? "Mengirim..." : "Kirim Laporan"}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="divider my-1" />

            <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">Ajukan Sengketa</div>
                {!canDispute ? (
                    <div className="rounded-box border border-base-300 bg-base-200/40 p-3 text-xs text-base-content/60">
                        {match.hasOpenDispute ? "Sengketa sedang diproses." : "Match sudah selesai."}
                    </div>
                ) : (
                    <>
                        <div>
                            <label className={labelCls}>Alasan (opsional)</label>
                            <input
                                type="text"
                                className={inputCls}
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                placeholder="Contoh: skor berbeda, bukti terlampir"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Bukti Sengketa (opsional)</label>
                            <EvidenceUploader value={disputeEvidence} onChange={setDisputeEvidence} />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button className={`${btnOutline} w-full sm:w-auto`} type="button" onClick={handleDispute} disabled={submittingDispute}>
                                {submittingDispute ? "Mengirim..." : "Ajukan Sengketa"}
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
