"use client";

import { useState } from "react";
import { useToast } from "@/components/dashboard/toast";
import { btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { formatGameId, requiresNumericGameId } from "@/lib/game-id";
import { useLocale } from "@/hooks/use-locale";

interface GameProfile {
    gameType: string;
    gameName?: string;
    ign: string;
    gameId: string;
}

interface GameProfileFormProps {
    gameType: string;
    gameName?: string;
    badge?: string;
    accent?: string;
    initialData?: GameProfile;
    onSaved?: () => void;
    embedded?: boolean;
}

export function GameProfileForm({
    gameType,
    gameName,
    badge,
    accent,
    initialData,
    onSaved,
    embedded = false,
}: GameProfileFormProps) {
    const { t } = useLocale();
    const [ign, setIgn] = useState(initialData?.ign || "");
    const initialGameId = requiresNumericGameId(gameType)
        ? formatGameId(initialData?.gameId || "")
        : (initialData?.gameId || "");
    const [gameId, setGameId] = useState(initialGameId);
    const [loading, setLoading] = useState(false);
    const { success, error } = useToast();

    const isNumericGame = requiresNumericGameId(gameType);
    const title = gameType === "DUEL_LINKS"
        ? t.dashboard.profile.gameForm.titles.duelLinks
        : gameType === "MASTER_DUEL"
          ? t.dashboard.profile.gameForm.titles.masterDuel
          : gameName || gameType;
    const idLabel = gameType === "DUEL_LINKS"
        ? t.dashboard.profile.gameForm.idLabelDuelLinks
        : gameType === "MASTER_DUEL"
          ? t.dashboard.profile.gameForm.idLabelMasterDuel
          : t.dashboard.profile.gameForm.idLabelGeneric;
    const idPlaceholder = isNumericGame
        ? t.dashboard.profile.gameForm.gameIdPlaceholder
        : t.dashboard.profile.gameForm.gameIdPlaceholderGeneric;
    const badgeLabel = badge || (isNumericGame ? (gameType === "MASTER_DUEL" ? "MD" : "DL") : (gameType.slice(0, 2).toUpperCase()));
    const badgeAccent = accent || (gameType === "MASTER_DUEL" ? "from-red-600 to-orange-600" : "from-blue-600 to-cyan-500");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/profile/game", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameType, ign, gameId: isNumericGame ? formatGameId(gameId) : gameId }),
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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br ${badgeAccent}`}>
                    {badgeLabel}
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
                        inputMode={isNumericGame ? "numeric" : "text"}
                        placeholder={idPlaceholder}
                        className={inputCls}
                        onChange={(e) => setGameId(isNumericGame ? formatGameId(e.target.value) : e.target.value)}
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
