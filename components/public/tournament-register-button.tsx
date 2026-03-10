"use client";

import { useState } from "react";

export function TournamentRegisterButton({
    tournamentId,
    disabled,
}: {
    tournamentId: string;
    disabled: boolean;
}) {
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleRegister = async () => {
        setSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch(`/api/tournaments/${tournamentId}/register`, { method: "POST" });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Pendaftaran turnamen belum dapat diproses.");
            }

            setMessage({ type: "success", text: result.message || "Pendaftaran Anda berhasil dikonfirmasi." });
        } catch (error) {
            setMessage({
                type: "error",
                text: error instanceof Error ? error.message : "Pendaftaran turnamen belum dapat diproses.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            <button type="button" onClick={handleRegister} disabled={disabled || submitting} className={`btn w-full rounded-box ${disabled ? "btn-disabled" : "btn-primary"}`}>
                {submitting ? "Memproses pendaftaran..." : disabled ? "Pendaftaran belum tersedia" : "Daftar Turnamen"}
            </button>
            {message ? (
                <div className={`alert rounded-box text-sm ${message.type === "success" ? "alert-success" : "alert-error"}`}>
                    {message.text}
                </div>
            ) : null}
        </div>
    );
}
