"use client";

import { useState } from "react";
import { useToast } from "@/components/dashboard/toast";

interface GameProfile {
    gameType: string;
    ign: string;
    gameId: string;
}

interface GameProfileFormProps {
    gameType: "DUEL_LINKS" | "MASTER_DUEL";
    initialData?: GameProfile;
}

export function GameProfileForm({ gameType, initialData }: GameProfileFormProps) {
    const [ign, setIgn] = useState(initialData?.ign || "");
    const [gameId, setGameId] = useState(initialData?.gameId || "");
    const [loading, setLoading] = useState(false);
    const { success, error } = useToast();

    const title = gameType === "DUEL_LINKS" ? "Yu-Gi-Oh! Duel Links" : "Yu-Gi-Oh! Master Duel";
    const idLabel = gameType === "DUEL_LINKS" ? "Friend ID" : "Duelist ID";
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
            } else {
                error(data.message || "Gagal memperbarui profil");
            }
        } catch (err) {
            error("Terjadi kesalahan jaringan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${isMasterDuel ? "bg-gradient-to-br from-red-600 to-orange-600" : "bg-gradient-to-br from-blue-600 to-cyan-500"}`}>
                    {isMasterDuel ? "MD" : "DL"}
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{title}</h3>
                    <p className="text-xs text-gray-400">Atur profil game kamu untuk turnamen</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-1.5">
                        In-Game Name (IGN)
                    </label>
                    <input
                        type="text"
                        value={ign}
                        onChange={(e) => setIgn(e.target.value)}
                        placeholder="[DS] Player"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 transition-all"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-1.5">
                        {idLabel}
                    </label>
                    <input
                        type="text"
                        value={gameId}
                        onChange={(e) => setGameId(e.target.value)}
                        placeholder={isMasterDuel ? "123-456-789" : "123456789"}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 transition-all"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || (!ign && !gameId)}
                    className="w-full px-4 py-2.5 rounded-xl bg-ds-amber hover:bg-ds-gold text-black font-semibold text-sm transition-all disabled:opacity-50 mt-2"
                >
                    {loading ? "Menyimpan..." : "Simpan Profil Game"}
                </button>
            </div>
        </form>
    );
}
