import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { TournamentRegisterButton } from "@/components/public/tournament-register-button";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { resolveTournamentImage } from "@/lib/tournament-image";

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(value: Date) {
    return value.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getStatusTone(status: string) {
    if (status === "OPEN") return "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
    if (status === "ONGOING") return "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300";
    if (status === "COMPLETED") return "border-sky-500/30 bg-sky-500/12 text-sky-700 dark:text-sky-300";
    return "border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-[#151922] dark:text-white/60";
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            participants: {
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            avatarUrl: true,
                            role: true,
                        },
                    },
                },
                orderBy: { joinedAt: "asc" },
            },
        },
    });

    if (!tournament) notFound();
    const imageUrl = resolveTournamentImage(tournament.image);

    return (
        <main className="min-h-screen bg-[linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_100%)] text-slate-950 dark:bg-[linear-gradient(180deg,_#09090b_0%,_#101114_42%,_#151922_100%)] dark:text-white">
            <Navbar />
            <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top,rgba(255,201,22,0.18),transparent_25%),linear-gradient(180deg,#fffdf7,#f5f7fb)] pt-28 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(255,201,22,0.16),transparent_25%),radial-gradient(circle_at_right,rgba(56,189,248,0.1),transparent_24%),linear-gradient(180deg,#15181f,#0d1015)]">
                <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
                    <Link href="/tournaments" className="mb-6 inline-flex items-center text-sm font-semibold text-slate-500 transition-colors hover:text-amber-500 dark:text-white/55 dark:hover:text-[#FFC916]">
                        Kembali ke daftar tournament
                    </Link>
                    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.09)] dark:border-white/10 dark:bg-[#11161d] dark:shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
                            <div className="relative min-h-[320px] border-b border-slate-200 bg-gradient-to-br from-cyan-200 via-white to-amber-50 dark:border-white/10 dark:from-cyan-950 dark:via-zinc-900 dark:to-black">
                                {imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={imageUrl} alt={tournament.title} className="absolute inset-0 h-full w-full object-cover opacity-35 dark:opacity-45" />
                                ) : null}
                                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.82))] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.78))]" />
                                <div className="relative flex min-h-[320px] flex-col justify-end p-8">
                                    <div className="mb-4 flex flex-wrap items-center gap-3">
                                        <span className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] ${getStatusTone(tournament.status)}`}>
                                            {tournament.status}
                                        </span>
                                        <span className="rounded-full border border-slate-300 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 dark:border-white/15 dark:bg-[#11161d]/90 dark:text-white/72">
                                            {tournament.format}
                                        </span>
                                        <span className="rounded-full border border-slate-300 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 dark:border-white/15 dark:bg-[#11161d]/90 dark:text-white/72">
                                            {tournament.gameType === "MASTER_DUEL" ? "Master Duel" : "Duel Links"}
                                        </span>
                                    </div>
                                    <h1 className="max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl dark:text-white">{tournament.title}</h1>
                                    <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-white/60">
                                        {tournament.description?.trim() || "Bracket komunitas Duel Standby untuk duel yang tertata, terbuka, dan kompetitif."}
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4 p-6 md:grid-cols-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#161b23]">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-white/30">Jadwal</div>
                                    <div className="text-sm font-semibold text-slate-700 dark:text-white/85">{formatDate(tournament.startDate)}</div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#161b23]">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-white/30">Prize Pool</div>
                                    <div className="text-sm font-semibold text-amber-600 dark:text-[#FFC916]">{formatCurrency(tournament.prizePool)}</div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#161b23]">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-white/30">Entry Fee</div>
                                    <div className="text-sm font-semibold text-slate-700 dark:text-white/85">{tournament.entryFee > 0 ? formatCurrency(tournament.entryFee) : "Free Entry"}</div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#161b23]">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-white/30">Participants</div>
                                    <div className="text-sm font-semibold text-slate-700 dark:text-white/85">{tournament.participants.length} pemain</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#11161d] dark:shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
                                <div className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-amber-600 dark:text-[#FFC916]">Pendaftaran</div>
                                <h2 className="mb-2 text-2xl font-black text-slate-950 dark:text-white">Ikut Tournament</h2>
                                <p className="mb-5 text-sm leading-6 text-slate-600 dark:text-white/55">
                                    Buka detail, cek ringkasan event, lalu daftar langsung saat slot masih tersedia.
                                </p>
                                <TournamentRegisterButton tournamentId={tournament.id} disabled={tournament.status !== "OPEN"} />
                            </div>

                            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#11161d] dark:shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
                                <div className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-amber-600 dark:text-[#FFC916]">Daftar Peserta</div>
                                {tournament.participants.length === 0 ? (
                                    <p className="text-sm text-slate-600 dark:text-white/55">Belum ada peserta. Jadilah yang pertama masuk bracket ini.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {tournament.participants.map((participant, index) => (
                                            <div key={participant.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-[#161b23]">
                                                <div className="flex items-center gap-3">
                                                    {normalizeAssetUrl(participant.user.avatarUrl) ? (
                                                        <img
                                                            src={normalizeAssetUrl(participant.user.avatarUrl) || undefined}
                                                            alt={participant.user.fullName}
                                                            className="h-10 w-10 rounded-full border border-slate-200 object-cover dark:border-white/10"
                                                        />
                                                    ) : (
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFC916] font-black text-[#111111]">
                                                            {participant.user.fullName.slice(0, 1).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-slate-900 dark:text-white">{participant.user.fullName}</div>
                                                        <div className="text-xs text-slate-500 dark:text-white/45">{participant.gameId}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right text-xs text-slate-500 dark:text-white/45">
                                                    <div>#{String(index + 1).padStart(2, "0")}</div>
                                                    <div>{participant.user.role}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <Footer />
        </main>
    );
}
