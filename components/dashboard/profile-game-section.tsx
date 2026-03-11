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
                idLabel: "DUELIST ID",
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
                                    {hasProfile ? "Edit" : "Tambah"}
                                </span>
                            </div>

                            <div className="mt-4 rounded-box border border-base-300 bg-base-200/50 px-4 py-4">
                                {hasProfile ? (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1 border-b border-base-300 pb-3 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">
                                                IGN
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
                                                {formatGameId(card.profile?.gameId || "")}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm leading-6 text-base-content/60">
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
