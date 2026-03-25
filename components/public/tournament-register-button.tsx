"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/dashboard/toast";
import { useLocale } from "@/hooks/use-locale";

export function TournamentRegisterButton({
    tournamentId,
    disabled,
    isRegistered = false,
    isFull = false,
    entryFee = 0,
    paymentStatus = null,
    participantStatus = null,
}: {
    tournamentId: string;
    disabled: boolean;
    isRegistered?: boolean;
    isFull?: boolean;
    entryFee?: number;
    paymentStatus?: "PENDING" | "VERIFIED" | "REJECTED" | null;
    participantStatus?: "REGISTERED" | "CHECKED_IN" | "DISQUALIFIED" | "PLAYING" | "WAITLIST" | null;
}) {
    const router = useRouter();
    const { success, error: toastError } = useToast();
    const { t } = useLocale();
    const [submitting, setSubmitting] = useState(false);
    const [registered, setRegistered] = useState(isRegistered);
    const [localPaymentStatus, setLocalPaymentStatus] = useState<"PENDING" | "VERIFIED" | "REJECTED" | null>(paymentStatus);
    const [localStatus, setLocalStatus] = useState(participantStatus);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);

    useEffect(() => {
        setRegistered(isRegistered);
    }, [isRegistered]);

    useEffect(() => {
        setLocalPaymentStatus(paymentStatus);
    }, [paymentStatus]);

    useEffect(() => {
        setLocalStatus(participantStatus);
    }, [participantStatus]);

    const handleRegister = async () => {
        setSubmitting(true);

        try {
            const response = await fetch(`/api/tournaments/${tournamentId}/register`, { method: "POST" });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || t.tournamentRegister.errors.registerFailed);
            }

            success(result.message || t.tournamentRegister.successRegistered);
            setRegistered(true);
            if (result?.participant?.paymentStatus) {
                setLocalPaymentStatus(result.participant.paymentStatus);
            } else {
                setLocalPaymentStatus("VERIFIED");
            }
            if (result?.participant?.status) {
                setLocalStatus(result.participant.status);
            }
            router.refresh();
        } catch (error) {
            error instanceof Error ? toastError(error.message) : toastError(t.tournamentRegister.errors.registerFailed);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUploadProof = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || t.tournamentRegister.errors.uploadFailed);
            }
            setPaymentProofUrl(data.url);
        } catch (error) {
            error instanceof Error ? toastError(error.message) : toastError(t.tournamentRegister.errors.uploadFailed);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmitPayment = async () => {
        if (!paymentProofUrl) {
            toastError(t.tournamentRegister.errors.proofRequired);
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentProofUrl }),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || t.tournamentRegister.errors.registerFailed);
            }

            success(result.message || t.tournamentRegister.successPaymentSent);
            setRegistered(true);
            if (result?.participant?.paymentStatus) {
                setLocalPaymentStatus(result.participant.paymentStatus);
            } else {
                setLocalPaymentStatus("PENDING");
            }
            if (result?.participant?.status) {
                setLocalStatus(result.participant.status);
            }
            setShowPaymentModal(false);
            router.refresh();
        } catch (error) {
            error instanceof Error ? toastError(error.message) : toastError(t.tournamentRegister.errors.registerFailed);
        } finally {
            setSubmitting(false);
        }
    };

    const isPaidTournament = entryFee > 0;
    const isWaitlisted = localStatus === "WAITLIST";
    const isPending = registered && localPaymentStatus === "PENDING";
    const isRejected = registered && localPaymentStatus === "REJECTED";
    const isVerified = registered && localPaymentStatus === "VERIFIED";
    const registerDisabled = submitting || disabled;
    const closePaymentModal = () => {
        setShowPaymentModal(false);
        setPaymentProofUrl(null);
    };

    return (
        <div className="space-y-3">
            {isWaitlisted ? (
                <div className="badge badge-warning h-auto px-4 py-2 text-xs font-bold uppercase tracking-[0.2em]">
                    {t.tournamentRegister.waitlistBadge}
                </div>
            ) : isVerified ? (
                <div className="badge badge-success h-auto px-4 py-2 text-xs font-bold uppercase tracking-[0.2em]">
                    {t.tournamentRegister.registeredBadge}
                </div>
            ) : isPending ? (
                <div className="badge badge-warning h-auto px-4 py-2 text-xs font-bold uppercase tracking-[0.2em]">
                    {t.tournamentRegister.pendingBadge}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        if (isPaidTournament) {
                            setShowPaymentModal(true);
                        } else {
                            handleRegister();
                        }
                    }}
                    disabled={registerDisabled}
                    className={`btn w-full rounded-box ${registerDisabled ? "btn-disabled" : "btn-primary"}`}
                >
                    {submitting
                        ? t.tournamentRegister.loading
                        : isFull
                          ? t.tournamentRegister.joinWaitlist
                          : disabled
                            ? t.tournamentRegister.registrationClosed
                            : isRejected
                              ? t.tournamentRegister.reuploadProof
                              : t.tournamentRegister.register}
                </button>
            )}
            {showPaymentModal ? (
                <div className="modal modal-open">
                    <div className="modal-box max-w-lg border border-base-300 bg-base-100">
                        <h3 className="text-lg font-bold">{t.tournamentRegister.uploadTitle}</h3>
                        <p className="mt-2 text-sm text-base-content/60">
                            {t.tournamentRegister.uploadSubtitle}
                        </p>
                        <div className="mt-4 space-y-3">
                            {paymentProofUrl ? (
                                <div className="rounded-box border border-base-300 bg-base-200/50 p-3">
                                    <img src={paymentProofUrl} alt={t.tournamentRegister.proofAlt} className="h-32 w-full rounded-box object-cover" />
                                </div>
                            ) : null}
                            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-3 transition-all hover:border-primary/40 hover:bg-base-200/70">
                                <span className="text-sm text-base-content/55">{uploading ? t.tournamentRegister.uploading : t.tournamentRegister.chooseFile}</span>
                                <span className="btn btn-primary btn-xs rounded-box">{t.tournamentRegister.chooseFileButton}</span>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (file) handleUploadProof(file);
                                        event.currentTarget.value = "";
                                    }}
                                />
                            </label>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button type="button" className="btn btn-ghost" onClick={closePaymentModal}>
                                {t.common.cancel}
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSubmitPayment} disabled={submitting || uploading}>
                                {submitting ? t.tournamentRegister.sending : t.tournamentRegister.sendProof}
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={closePaymentModal} />
                </div>
            ) : null}
        </div>
    );
}
