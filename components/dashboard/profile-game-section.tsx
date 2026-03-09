"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus } from "lucide-react";
import { Modal } from "@/components/dashboard/modal";
import { GameProfileForm } from "@/components/dashboard/game-profile-form";
import { btnOutline } from "@/components/dashboard/form-styles";
import { formatGameId } from "@/lib/game-id";

type ProfileGameData = {
    gameType: "DUEL_LINKS" | "MASTER_DUEL";
    ign: string;
    gameId: string;
};

type CardGameData = {
    gameType: "DUEL_LINKS" | "MASTER_DUEL";
    title: string;
    subtitle: string;
    idLabel: string;
    badge: string;
    accent: string;
    profile?: ProfileGameData;
};

export function ProfileGameSection({
    duelLinksProfile,
    masterDuelProfile,
}: {
    duelLinksProfile?: ProfileGameData;
    masterDuelProfile?: ProfileGameData;
}) {
    const router = useRouter();
    const [activeGameType, setActiveGameType] = useState<"DUEL_LINKS" | "MASTER_DUEL" | null>(null);

    const cards: CardGameData[] = useMemo(
        () => [
            {
                gameType: "DUEL_LINKS",
                title: "Duel Links",
                subtitle: "Data akun game",
                idLabel: "Friend ID",
                badge: "DL",
                accent: "from-blue-600 to-cyan-500",
                profile: duelLinksProfile,
            },
            {
                gameType: "MASTER_DUEL",
                title: "Master Duel",
                subtitle: "Data akun game",
                idLabel: "Duelist ID",
                badge: "MD",
                accent: "from-red-600 to-orange-600",
                profile: masterDuelProfile,
            },
        ],
        [duelLinksProfile, masterDuelProfile],
    );

    const activeCard = cards.find((card) => card.gameType === activeGameType) || null;

    const closeModal = () => setActiveGameType(null);

    const handleSaved = () => {
        closeModal();
        router.refresh();
    };

    return (
        <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {cards.map((card) => {
                    const hasProfile = Boolean(card.profile);

                    return (
                        <button
                            key={card.gameType}
                            type="button"
                            onClick={() => setActiveGameType(card.gameType)}
                            className="group rounded-[24px] border border-black/5 bg-white/75 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-ds-amber/20 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-white/[0.035] dark:hover:border-ds-amber/20"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-sm font-black text-white shadow-lg`}>
                                        {card.badge}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-bold tracking-[0.04em] text-slate-950 dark:text-white">
                                            {card.title}
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-white/45">
                                            {card.subtitle}
                                        </p>
                                    </div>
                                </div>

                                <span className={`${btnOutline} shrink-0 gap-2 px-3 py-2 text-xs font-semibold`}>
                                    {hasProfile ? <Edit3 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                    {hasProfile ? "Edit" : "Tambah"}
                                </span>
                            </div>

                            <div className="mt-4 rounded-xl border border-black/5 bg-slate-50/80 px-4 py-4 dark:border-white/8 dark:bg-black/10">
                                {hasProfile ? (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1 border-b border-black/5 pb-3 dark:border-white/8 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">
                                                IGN
                                            </span>
                                            <span className="text-sm font-semibold text-slate-950 dark:text-white">
                                                {card.profile?.ign}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">
                                                {card.idLabel}
                                            </span>
                                            <span className="font-mono text-sm text-ds-amber">
                                                {formatGameId(card.profile?.gameId || "")}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm leading-6 text-slate-500 dark:text-white/45">
                                        Belum ada data. Klik untuk menambahkan profile.
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <Modal
                open={Boolean(activeCard)}
                onClose={closeModal}
                title={activeCard?.profile ? `Edit ${activeCard.title}` : `Tambah ${activeCard?.title || "Profile Game"}`}
                size="md"
            >
                {activeCard ? (
                    <GameProfileForm
                        gameType={activeCard.gameType}
                        initialData={activeCard.profile}
                        embedded
                        onSaved={handleSaved}
                    />
                ) : null}
            </Modal>
        </>
    );
}
