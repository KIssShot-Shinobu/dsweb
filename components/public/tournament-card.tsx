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

type TournamentCardProps = { tournament: PublicTournamentCardData; compact?: boolean; };

function formatPrize(amount: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount); }
function formatSchedule(date: string, compact = false) { return new Date(date).toLocaleDateString("id-ID", compact ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function getStatusLabel(status: string) { if (status === "OPEN") return "Buka"; if (status === "ONGOING") return "Berjalan"; if (status === "COMPLETED") return "Selesai"; if (status === "CANCELLED") return "Dibatalkan"; return status; }
function getStatusClass(status: string) { if (status === "OPEN") return "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"; if (status === "ONGOING") return "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300"; if (status === "COMPLETED") return "border-sky-500/30 bg-sky-500/12 text-sky-700 dark:text-sky-300"; return "border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-[#151922] dark:text-white/60"; }
function getGameAccent(gameType: string) { return gameType === "MASTER_DUEL" ? "from-orange-200 via-rose-100 to-white dark:from-[#2a1310] dark:via-[#3a1f15] dark:to-[#0f1014]" : "from-cyan-200 via-sky-100 to-white dark:from-[#0f1d29] dark:via-[#12283a] dark:to-[#0f1014]"; }

export function PublicTournamentCard({ tournament, compact = false }: TournamentCardProps) {
    const imageUrl = normalizeAssetUrl(tournament.image);

    return (
        <article className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.09)] transition-all hover:-translate-y-1 hover:border-[#FFC916]/40 active:scale-[0.99] dark:border-white/10 dark:bg-[#11161d] dark:shadow-[0_20px_60px_rgba(0,0,0,0.32)]">
            <div className={`relative min-h-[180px] overflow-hidden border-b border-slate-200 bg-gradient-to-br ${getGameAccent(tournament.gameType)} dark:border-white/10`}>
                {imageUrl ? <img src={imageUrl} alt={tournament.title} className="absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-500 group-hover:scale-105 dark:opacity-45" /> : null}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,201,22,0.22),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.72))] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,201,22,0.18),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.78))]" />
                <div className="relative flex h-full min-h-[180px] flex-col justify-between p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] sm:text-[11px] ${getStatusClass(tournament.status)}`}>{getStatusLabel(tournament.status)}</span>
                        {tournament.format ? <span className="rounded-full border border-slate-300 bg-white/75 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-slate-600 dark:border-white/15 dark:bg-[#11161d]/90 dark:text-white/72 sm:text-[11px]">{tournament.format}</span> : null}
                    </div>
                    <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-white/48 sm:text-[11px]">{tournament.gameType === "MASTER_DUEL" ? "Master Duel" : "Duel Links"}</p>
                        <h3 className="line-clamp-2 text-xl font-black leading-tight text-slate-950 sm:text-2xl dark:text-white">{tournament.title}</h3>
                    </div>
                </div>
            </div>
            <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/8 dark:bg-[#161b23]"><div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">Jadwal</div><div className="text-sm font-semibold text-slate-700 dark:text-white/88">{formatSchedule(tournament.startDate, compact)}</div></div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/8 dark:bg-[#161b23]"><div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">Prize Pool</div><div className="text-sm font-semibold text-amber-600 dark:text-[#FFC916]">{formatPrize(tournament.prizePool)}</div></div>
                </div>
                {!compact ? <div className="flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-white/60"><span>{tournament.participantCount ?? 0} peserta</span><span>{tournament.entryFee && tournament.entryFee > 0 ? formatPrize(tournament.entryFee) : "Gratis"}</span></div> : null}
                <p className={`text-sm leading-6 text-slate-600 dark:text-white/62 ${compact ? "line-clamp-2" : "line-clamp-3"}`}>{tournament.description?.trim() || "Bracket komunitas Duel Standby untuk duel yang rapi, terbuka, dan kompetitif."}</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link href={`/tournaments/${tournament.id}`} className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-white active:scale-[0.98] dark:border-white/12 dark:bg-[#161b23] dark:text-white dark:hover:border-white/25 dark:hover:bg-[#1b2230]">Detail</Link>
                    {!compact && tournament.status === "OPEN" ? <Link href={`/tournaments/${tournament.id}`} className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#FFC916] px-4 py-3 text-sm font-black text-[#111111] transition-all hover:bg-[#ffd84c] active:scale-[0.98]">Ikut</Link> : null}
                </div>
            </div>
        </article>
    );
}
