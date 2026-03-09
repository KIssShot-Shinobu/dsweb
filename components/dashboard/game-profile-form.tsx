"use client";

import { useState } from "react";
import { useToast } from "@/components/dashboard/toast";
import { btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { formatGameId } from "@/lib/game-id";

interface GameProfile {
    gameType: string;
    ign: string;
    gameId: string;
}

interface GameProfileFormProps {
    gameType: "DUEL_LINKS" | "MASTER_DUEL";
    initialData?: GameProfile;
    onSaved?: () => void;
    embedded?: boolean;
}

export function GameProfileForm({
    gameType,
    initialData,
    onSaved,
    embedded = false,
}: GameProfileFormProps) {
    const [ign, setIgn] = useState(initialData?.ign || "");
    const [gameId, setGameId] = useState(formatGameId(initialData?.gameId || ""));
    const [loading, setLoading] = useState(false);
    const { success, error } = useToast();

    const title = gameType === "DUEL_LINKS" ? "Yu-Gi-Oh! Duel Links" : "Yu-Gi-Oh! Master Duel";
    const idLabel = gameType === "DUEL_LINKS" ? "DUELIST ID" : "Duelist ID";
    const isMasterDuel = gameType === "MASTER_DUEL";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/profile/game", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameType, ign, gameId }),
            });

            const data = await res.json();
            if (res.ok) {
                success(`${title} Profil berhasil diperbarui`);
                onSaved?.();
            } else {
                error(data.message || "Gagal memperbarui profil");
            }
        } catch {
            error("Terjadi kesalahan jaringan");
        } finally {
            setLoading(false);
        }
    };

    const containerCls = embedded
        ? "space-y-4"
        : "rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/5 dark:bg-[#1a1a1a]";

    return (
        <form onSubmit={handleSubmit} className={containerCls}>
            <div className="mb-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${isMasterDuel ? "bg-gradient-to-br from-red-600 to-orange-600" : "bg-gradient-to-br from-blue-600 to-cyan-500"}`}>
                    {isMasterDuel ? "MD" : "DL"}
                </div>
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">{title}</h3>
                    <p className="text-xs text-gray-400 dark:text-white/35">Atur profil game Anda untuk turnamen dan identitas akun.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className={labelCls}>
                        In-Game Name (IGN)
                    </label>
                    <input
                        type="text"
                        value={ign}
                        onChange={(e) => setIgn(e.target.value)}
                        placeholder="[DS] Player"
                        className={inputCls}
                        required
                    />
                </div>
                <div>
                    <label className={labelCls}>
                        {idLabel}
                    </label>
                    <input
                        type="text"
                        value={gameId}
                        inputMode="numeric"
                        placeholder="123-456-789"
                        className={inputCls}
                        onChange={(e) => setGameId(formatGameId(e.target.value))}
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || (!ign && !gameId)}
                    className={`${btnPrimary} mt-2 w-full`}
                >
                    {loading ? "Menyimpan..." : initialData ? "Simpan Perubahan" : "Simpan Profil Game"}
                </button>
            </div>
        </form>
    );
}
