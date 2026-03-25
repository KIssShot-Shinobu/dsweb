"use client";

import { useState } from "react";
import { useToast } from "@/components/dashboard/toast";
import { btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { formatGameId } from "@/lib/game-id";
import { useLocale } from "@/hooks/use-locale";

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
    const { t } = useLocale();
    const [ign, setIgn] = useState(initialData?.ign || "");
    const [gameId, setGameId] = useState(formatGameId(initialData?.gameId || ""));
    const [loading, setLoading] = useState(false);
    const { success, error } = useToast();

    const title = gameType === "DUEL_LINKS" ? t.dashboard.profile.gameForm.titles.duelLinks : t.dashboard.profile.gameForm.titles.masterDuel;
    const idLabel = gameType === "DUEL_LINKS" ? t.dashboard.profile.gameForm.idLabelDuelLinks : t.dashboard.profile.gameForm.idLabelMasterDuel;
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
                success(t.dashboard.profile.gameForm.success.profileUpdated(title));
                onSaved?.();
            } else {
                error(data.message || t.dashboard.profile.gameForm.errors.updateFailed);
            }
        } catch {
            error(t.common.networkError);
        } finally {
            setLoading(false);
        }
    };

    const containerCls = embedded
        ? "space-y-4"
        : "rounded-box border border-base-300 bg-base-100 p-5 shadow-sm";

    return (
        <form onSubmit={handleSubmit} className={containerCls}>
            <div className="mb-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${isMasterDuel ? "bg-gradient-to-br from-red-600 to-orange-600" : "bg-gradient-to-br from-blue-600 to-cyan-500"}`}>
                    {isMasterDuel ? "MD" : "DL"}
                </div>
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-base-content">{title}</h3>
                    <p className="text-xs text-base-content/45">{t.dashboard.profile.gameForm.subtitle}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className={labelCls}>{t.dashboard.profile.gameForm.ignLabel}</label>
                    <input
                        type="text"
                        value={ign}
                        onChange={(e) => setIgn(e.target.value)}
                        placeholder={t.dashboard.profile.gameForm.ignPlaceholder}
                        className={inputCls}
                        required
                    />
                </div>
                <div>
                    <label className={labelCls}>{idLabel}</label>
                    <input
                        type="text"
                        value={gameId}
                        inputMode="numeric"
                        placeholder={t.dashboard.profile.gameForm.gameIdPlaceholder}
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
                    {loading ? t.dashboard.profile.gameForm.actions.saving : initialData ? t.dashboard.profile.gameForm.actions.saveChanges : t.dashboard.profile.gameForm.actions.saveProfile}
                </button>
            </div>
        </form>
    );
}
