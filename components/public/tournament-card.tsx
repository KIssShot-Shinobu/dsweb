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

type TournamentCardProps = {
    tournament: PublicTournamentCardData;
    compact?: boolean;
};

function formatPrize(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatSchedule(date: string, compact = false) {
    return new Date(date).toLocaleDateString("id-ID", compact
        ? { day: "numeric", month: "short", year: "numeric" }
        : { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getStatusLabel(status: string) {
    if (status === "OPEN") return "Open";
    if (status === "ONGOING") return "Ongoing";
    if (status === "COMPLETED") return "Completed";
    if (status === "CANCELLED") return "Cancelled";
    return status;
}

function getStatusClass(status: string) {
    if (status === "OPEN") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
    if (status === "ONGOING") return "border-amber-500/30 bg-amber-500/15 text-amber-300";
    if (status === "COMPLETED") return "border-sky-500/30 bg-sky-500/15 text-sky-300";
    return "border-white/10 bg-white/10 text-white/50";
}

function getGameAccent(gameType: string) {
    return gameType === "MASTER_DUEL"
        ? "from-red-950 via-orange-900/80 to-zinc-950"
        : "from-cyan-950 via-blue-900/80 to-zinc-950";
}

export function PublicTournamentCard({ tournament, compact = false }: TournamentCardProps) {
    const imageUrl = normalizeAssetUrl(tournament.image);

    return (
        <article className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-1 hover:border-[#FFC916]/30">
            <div className={`relative min-h-[180px] overflow-hidden border-b border-white/10 bg-gradient-to-br ${getGameAccent(tournament.gameType)}`}>
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl}
                        alt={tournament.title}
                        className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-105"
                    />
                ) : null}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,201,22,0.22),transparent_36%),linear-gradient(180deg,rgba(0,0,0,0.15),rgba(0,0,0,0.72))]" />
                <div className="relative flex h-full min-h-[180px] flex-col justify-between p-5">
                    <div className="flex items-start justify-between gap-3">
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${getStatusClass(tournament.status)}`}>
                            {getStatusLabel(tournament.status)}
                        </span>
                        {tournament.format ? (
                            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-white/70">
                                {tournament.format}
                            </span>
                        ) : null}
                    </div>
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/55">
                            {tournament.gameType === "MASTER_DUEL" ? "Master Duel" : "Duel Links"}
                        </p>
                        <h3 className="line-clamp-2 text-2xl font-black leading-tight text-white">
                            {tournament.title}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="space-y-5 p-5">
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Jadwal</div>
                        <div className="text-sm font-semibold text-white/85">{formatSchedule(tournament.startDate, compact)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">Prize Pool</div>
                        <div className="text-sm font-semibold text-[#FFC916]">{formatPrize(tournament.prizePool)}</div>
                    </div>
                </div>

                {!compact ? (
                    <div className="flex items-center justify-between text-sm text-white/55">
                        <span>{tournament.participantCount ?? 0} peserta</span>
                        <span>{tournament.entryFee && tournament.entryFee > 0 ? formatPrize(tournament.entryFee) : "Free Entry"}</span>
                    </div>
                ) : null}

                <p className={`text-sm leading-6 text-white/58 ${compact ? "line-clamp-2" : "line-clamp-3"}`}>
                    {tournament.description?.trim() || "Turnamen komunitas Duel Standby untuk pemain yang siap naik bracket dan rebut hadiah."}
                </p>

                <div className="flex items-center gap-3">
                    <Link
                        href={`/tournaments/${tournament.id}`}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition-all hover:border-white/25 hover:bg-white/[0.08]"
                    >
                        Lihat Detail
                    </Link>
                    {!compact && tournament.status === "OPEN" ? (
                        <Link
                            href={`/tournaments/${tournament.id}`}
                            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#FFC916] px-4 py-3 text-sm font-black text-[#111111] transition-all hover:bg-[#ffd84c]"
                        >
                            Daftar
                        </Link>
                    ) : null}
                </div>
            </div>
        </article>
    );
}
