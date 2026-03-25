"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus } from "lucide-react";
import { Modal } from "@/components/dashboard/modal";
import { GameProfileForm } from "@/components/dashboard/game-profile-form";
import { btnOutline } from "@/components/dashboard/form-styles";
import { formatGameId, requiresNumericGameId } from "@/lib/game-id";
import { useLocale } from "@/hooks/use-locale";
import { useGames, type GameOption } from "@/hooks/use-games";

type ProfileGameData = {
    gameType: string;
    gameName?: string;
    ign: string;
    gameId: string;
};

type CardGameData = {
    gameType: string;
    title: string;
    subtitle: string;
    idLabel: string;
    badge: string;
    accent: string;
    profile?: ProfileGameData;
};

export function ProfileGameSection({
    profiles,
}: {
    profiles: ProfileGameData[];
}) {
    const { t } = useLocale();
    const router = useRouter();
    const { games } = useGames();
    const [activeGameType, setActiveGameType] = useState<string | null>(null);

    const getGameBadge = (code: string) => {
        const upper = code.toUpperCase();
        if (upper.includes("MASTER")) return "MD";
        if (upper.includes("DUEL")) return "DL";
        const initials = code
            .replace(/_/g, " ")
            .split(" ")
            .filter(Boolean)
            .map((part) => part[0]?.toUpperCase())
            .join("");
        return initials.slice(0, 2) || code.slice(0, 2).toUpperCase();
    };

    const getGameAccent = (code: string) => {
        const upper = code.toUpperCase();
        if (upper.includes("MASTER")) return "from-red-600 to-orange-600";
        if (upper.includes("DUEL")) return "from-blue-600 to-cyan-500";
        return "from-emerald-600 to-teal-500";
    };

    const cards: CardGameData[] = useMemo(
        () => {
            const activeCodes = new Set(games.map((game) => game.code));
            const gameCards: CardGameData[] = games.map((game) => ({
                gameType: game.code,
                title: game.name,
                subtitle: t.dashboard.profile.gameSection.cards.subtitle,
                idLabel: t.dashboard.profile.gameSection.cards.generic.idLabel,
                badge: getGameBadge(game.code),
                accent: getGameAccent(game.code),
                profile: profiles.find((profile) => profile.gameType === game.code),
            }));

            const profileOnlyCards = profiles
                .filter((profile) => !activeCodes.has(profile.gameType))
                .map((profile) => ({
                    gameType: profile.gameType,
                    title: profile.gameName || profile.gameType,
                    subtitle: t.dashboard.profile.gameSection.cards.subtitle,
                    idLabel: t.dashboard.profile.gameSection.cards.generic.idLabel,
                    badge: getGameBadge(profile.gameType),
                    accent: getGameAccent(profile.gameType),
                    profile,
                }));

            return [...gameCards, ...profileOnlyCards];
        },
        [games, profiles, t],
    );

    const activeCard = cards.find((card) => card.gameType === activeGameType) || null;

    const closeModal = () => setActiveGameType(null);

    const handleSaved = () => {
        closeModal();
        router.refresh();
    };

    return (
        <>
            {cards.length === 0 ? (
                <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-6 text-sm text-base-content/60">
                    {t.dashboard.profile.gameSection.empty}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {cards.map((card) => {
                        const hasProfile = Boolean(card.profile);

                        return (
                            <button
                                key={card.gameType}
                                type="button"
                                onClick={() => setActiveGameType(card.gameType)}
                                className="group rounded-box border border-base-300 bg-base-100 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-sm font-black text-white shadow-lg`}>
                                            {card.badge}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-bold tracking-[0.04em] text-base-content">
                                                {card.title}
                                            </div>
                                            <p className="mt-0.5 text-xs leading-5 text-base-content/60">
                                                {card.subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    <span className={`${btnOutline} btn-sm w-full justify-center gap-2 px-3 py-2 text-xs font-semibold sm:w-auto`}>
                                        {hasProfile ? <Edit3 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                        {hasProfile ? t.dashboard.profile.gameSection.actions.edit : t.dashboard.profile.gameSection.actions.add}
                                    </span>
                                </div>

                                <div className="mt-4 rounded-box border border-base-300 bg-base-200/50 px-4 py-4">
                                    {hasProfile ? (
                                        <div className="space-y-3">
                                            <div className="flex flex-col gap-1 border-b border-base-300 pb-3 sm:flex-row sm:items-center sm:justify-between">
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">
                                                    {t.dashboard.profile.gameSection.labels.ign}
                                                </span>
                                                <span className="text-sm font-semibold text-base-content">
                                                    {card.profile?.ign}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">
                                                    {card.idLabel}
                                                </span>
                                                <span className="font-mono text-sm text-primary">
                                                    {requiresNumericGameId(card.gameType) ? formatGameId(card.profile?.gameId || "") : card.profile?.gameId || "-"}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm leading-6 text-base-content/60">
                                            {t.dashboard.profile.gameSection.empty}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <Modal
                open={Boolean(activeCard)}
                onClose={closeModal}
                title={
                    activeCard?.profile
                        ? t.dashboard.profile.gameSection.modalTitleEdit(activeCard.title)
                        : t.dashboard.profile.gameSection.modalTitleAdd(activeCard?.title || t.dashboard.profile.gameSection.modalFallback)
                }
                size="md"
            >
                {activeCard ? (
                    <GameProfileForm
                        gameType={activeCard.gameType}
                        gameName={activeCard.title}
                        badge={activeCard.badge}
                        accent={activeCard.accent}
                        initialData={activeCard.profile}
                        embedded
                        onSaved={handleSaved}
                    />
                ) : null}
            </Modal>
        </>
    );
}
