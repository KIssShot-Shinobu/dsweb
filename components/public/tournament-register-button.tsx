"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/dashboard/toast";

export function TournamentRegisterButton({
    tournamentId,
    disabled,
    isRegistered = false,
}: {
    tournamentId: string;
    disabled: boolean;
    isRegistered?: boolean;
}) {
    const router = useRouter();
    const { success, error: toastError } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [registered, setRegistered] = useState(isRegistered);

    useEffect(() => {
        setRegistered(isRegistered);
    }, [isRegistered]);

    const handleRegister = async () => {
        setSubmitting(true);

        try {
            const response = await fetch(`/api/tournaments/${tournamentId}/register`, { method: "POST" });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Pendaftaran turnamen belum dapat diproses.");
            }

            success(result.message || "Pendaftaran Anda berhasil dikonfirmasi.");
            setRegistered(true);
            router.refresh();
        } catch (error) {
            error instanceof Error ? toastError(error.message) : toastError("Pendaftaran turnamen belum dapat diproses.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            {registered ? (
                <div className="badge badge-success h-auto px-4 py-2 text-xs font-bold uppercase tracking-[0.2em]">
                    Registered
                </div>
            ) : (
                <button
                    type="button"
                    onClick={handleRegister}
                    disabled={disabled || submitting}
                    className={`btn w-full rounded-box ${disabled ? "btn-disabled" : "btn-primary"}`}
                >
                    {submitting ? "Memproses pendaftaran..." : disabled ? "Pendaftaran belum tersedia" : "Daftar Turnamen"}
                </button>
            )}
        </div>
    );
}
