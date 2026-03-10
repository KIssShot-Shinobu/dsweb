import Image from "next/image";
import Link from "next/link";
import { normalizeAssetUrl } from "@/lib/asset-url";

export type PublicTournamentCardData = {
    id: string;
    title: string;
    gameType: "DUEL_LINKS" | "MASTER_DUEL" | string;
    format?: "BO1" | "BO3" | "BO5" | string;
    status: "OPEN" | "ONGOING" | "COMPLETED" | "CANCELLED" | string;
    startDate: string;
    prizePool: number;
    entryFee?: number;
    image?: string | null;
    participantCount?: number;
    description?: string | null;
};

type TournamentCardProps = { tournament: PublicTournamentCardData; compact?: boolean };

function formatPrize(amount: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function formatSchedule(date: string, compact = false) {
    return new Date(date).toLocaleDateString(
        "id-ID",
        compact
            ? { day: "numeric", month: "short", year: "numeric" }
            : { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
    );
}

function getStatusLabel(status: string) {
    if (status === "OPEN") return "Registrasi Dibuka";
    if (status === "ONGOING") return "Sedang Berlangsung";
    if (status === "COMPLETED") return "Selesai";
    if (status === "CANCELLED") return "Dibatalkan";
    return status;
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
                            {getStatusLabel(tournament.status)}
                        </span>
                        {tournament.format ? <span className="badge badge-outline h-auto px-3 py-2 text-[10px] font-semibold tracking-[0.18em]">{tournament.format}</span> : null}
                    </div>
                    <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-base-content/55 sm:text-[11px]">
                            {tournament.gameType === "MASTER_DUEL" ? "Master Duel" : "Duel Links"}
                        </p>
                        <h3 className="line-clamp-2 text-xl font-black leading-tight text-base-content sm:text-2xl">{tournament.title}</h3>
                    </div>
                </div>
            </div>
            <div className="card-body space-y-4 p-4 sm:space-y-5 sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-base-content/50">Jadwal Event</div>
                        <div className="text-sm font-semibold text-base-content">{formatSchedule(tournament.startDate, compact)}</div>
                    </div>
                    <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-base-content/50">Prize Pool</div>
                        <div className="text-sm font-semibold text-primary">{formatPrize(tournament.prizePool)}</div>
                    </div>
                </div>
                {!compact ? (
                    <div className="flex flex-col gap-1 text-sm text-base-content/60 sm:flex-row sm:items-center sm:justify-between">
                        <span>{tournament.participantCount ?? 0} peserta terdaftar</span>
                        <span>{tournament.entryFee && tournament.entryFee > 0 ? formatPrize(tournament.entryFee) : "Tanpa biaya pendaftaran"}</span>
                    </div>
                ) : null}
                <p className={`text-sm leading-6 text-base-content/70 ${compact ? "line-clamp-2" : "line-clamp-3"}`}>
                    {tournament.description?.trim() || "Turnamen komunitas Duel Standby dengan alur yang tertata, informasi yang transparan, dan atmosfer kompetitif yang sehat."}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link href={`/tournaments/${tournament.id}`} className="btn btn-outline flex-1 rounded-box">
                        Lihat Detail
                    </Link>
                    {!compact && tournament.status === "OPEN" ? (
                        <Link href={`/tournaments/${tournament.id}`} className="btn btn-primary flex-1 rounded-box">
                            Daftar Sekarang
                        </Link>
                    ) : null}
                </div>
            </div>
        </article>
    );
}
