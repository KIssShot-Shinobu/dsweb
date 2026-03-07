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
                throw new Error(result.message || "Gagal mendaftar turnamen.");
            }

            setMessage({ type: "success", text: result.message || "Berhasil mendaftar turnamen." });
        } catch (error) {
            setMessage({
                type: "error",
                text: error instanceof Error ? error.message : "Gagal mendaftar turnamen.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={handleRegister}
                disabled={disabled || submitting}
                className={`w-full rounded-2xl px-5 py-3 text-sm font-black transition-all ${
                    disabled
                        ? "cursor-not-allowed bg-white/8 text-white/35"
                        : "bg-[#FFC916] text-[#111111] hover:bg-[#ffd84c]"
                }`}
            >
                {submitting ? "Memproses..." : disabled ? "Pendaftaran Ditutup" : "Daftar Tournament"}
            </button>
            {message ? (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${
                    message.type === "success"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/20 bg-red-500/10 text-red-300"
                }`}>
                    {message.text}
                </div>
            ) : null}
        </div>
    );
}
