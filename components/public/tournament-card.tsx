'use client';

import Image from "next/image";
import Link from "next/link";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { useLocale } from "@/hooks/use-locale";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";

export type PublicTournamentCardData = {
    id: string;
    title: string;
    gameType: "DUEL_LINKS" | "MASTER_DUEL" | string;
    gameName?: string;
    format?: "BO1" | "BO3" | "BO5" | string;
    status: "OPEN" | "ONGOING" | "COMPLETED" | "CANCELLED" | string;
    startAt: string;
    prizePool: number;
    entryFee?: number;
    image?: string | null;
    participantCount?: number;
    maxPlayers?: number | null;
    description?: string | null;
};

type TournamentCardProps = { tournament: PublicTournamentCardData; compact?: boolean };

function formatSchedule(date: string, locale: ReturnType<typeof useLocale>["locale"], compact = false) {
    return formatDateTime(
        date,
        locale,
        compact
            ? { day: "numeric", month: "short", year: "numeric" }
            : { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }
    );
}

function getStatusClass(status: string) {
    if (status === "OPEN") return "badge-success";
    if (status === "ONGOING") return "badge-warning";
    if (status === "COMPLETED") return "badge-info";
    return "badge-ghost";
}

function getGameAccent(gameType: string) {
    return gameType === "MASTER_DUEL"
        ? "from-secondary/25 via-base-200 to-warning/15"
        : "from-info/20 via-base-200 to-primary/10";
}

export function PublicTournamentCard({ tournament, compact = false }: TournamentCardProps) {
    const imageUrl = normalizeAssetUrl(tournament.image);
    const { locale, t } = useLocale();

    const statusLabel = t.tournament.status[tournament.status as keyof typeof t.tournament.status] ?? tournament.status;

    return (
        <article className="group card overflow-hidden border border-base-300 bg-base-100 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
            <div className={`relative min-h-[180px] overflow-hidden bg-gradient-to-br ${getGameAccent(tournament.gameType)}`}>
                {imageUrl ? (
                    <Image
                        unoptimized
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        src={imageUrl}
                        alt={tournament.title}
                        className="absolute inset-0 h-full w-full object-cover opacity-30 transition-transform duration-500 group-hover:scale-105"
                    />
                ) : null}
                <div className="absolute inset-0 bg-base-100/72" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,201,22,0.22),transparent_36%)]" />
                <div className="relative flex min-h-[180px] flex-col justify-between p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <span className={`badge h-auto px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] ${getStatusClass(tournament.status)}`}>
                            {statusLabel}
                        </span>
                        {tournament.format ? <span className="badge badge-outline h-auto px-3 py-2 text-[10px] font-semibold tracking-[0.18em]">{tournament.format}</span> : null}
                    </div>
                    <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-base-content/55 sm:text-[11px]">
                            {tournament.gameName ?? (tournament.gameType === "MASTER_DUEL" ? t.tournament.gameMasterDuel : t.tournament.gameDuelLinks)}
                        </p>
                        <h3 className="line-clamp-2 text-lg font-black leading-tight text-base-content sm:text-xl lg:text-2xl">{tournament.title}</h3>
                    </div>
                </div>
            </div>
            <div className="card-body space-y-4 p-4 sm:space-y-5 sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-base-content/50">{t.tournament.scheduleLabel}</div>
                        <div className="text-xs font-semibold text-base-content sm:text-sm">{formatSchedule(tournament.startAt, locale, compact)}</div>
                    </div>
                    <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-base-content/50">Prize Pool</div>
                        <div className="text-xs font-semibold text-primary sm:text-sm">{formatCurrency(tournament.prizePool, locale)}</div>
                    </div>
                </div>
                {!compact ? (
                    <div className="flex flex-col gap-1 text-xs text-base-content/60 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
                        <span>
                            {tournament.maxPlayers
                                ? t.tournament.participantsLabel(tournament.participantCount ?? 0, tournament.maxPlayers)
                                : t.tournament.registeredLabel(tournament.participantCount ?? 0)}
                        </span>
                        <span>{tournament.entryFee && tournament.entryFee > 0 ? formatCurrency(tournament.entryFee, locale) : t.tournament.freeEntry}</span>
                    </div>
                ) : null}
                <p className={`text-xs leading-6 text-base-content/70 sm:text-sm ${compact ? "line-clamp-2" : "line-clamp-3"}`}>
                    {tournament.description?.trim() || t.tournament.defaultDescription}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link href={`/tournaments/${tournament.id}`} className="btn btn-outline flex-1 rounded-box">
                        {t.tournament.viewDetail}
                    </Link>
                    {!compact && tournament.status === "OPEN" ? (
                        <Link href={`/tournaments/${tournament.id}`} className="btn btn-primary flex-1 rounded-box">
                            {t.tournament.registerNow}
                        </Link>
                    ) : null}
                </div>
            </div>
        </article>
    );
}
