import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { TournamentRegisterButton } from "@/components/public/tournament-register-button";

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
    if (status === "OPEN") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
    if (status === "ONGOING") return "border-amber-500/30 bg-amber-500/15 text-amber-300";
    if (status === "COMPLETED") return "border-sky-500/30 bg-sky-500/15 text-sky-300";
    return "border-white/10 bg-white/10 text-white/50";
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

    return (
        <main className="min-h-screen bg-[#0f0f0f] text-white">
            <Navbar />
            <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,201,22,0.16),transparent_25%),linear-gradient(180deg,#161616,#0f0f0f)] pt-28">
                <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
                    <Link href="/tournaments" className="mb-6 inline-flex items-center text-sm font-semibold text-white/55 transition-colors hover:text-[#FFC916]">
                        Kembali ke semua tournament
                    </Link>
                    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#171717]">
                            <div className="relative min-h-[320px] border-b border-white/10 bg-gradient-to-br from-cyan-950 via-zinc-900 to-black">
                                {tournament.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={tournament.image} alt={tournament.title} className="absolute inset-0 h-full w-full object-cover opacity-45" />
                                ) : null}
                                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.78))]" />
                                <div className="relative flex min-h-[320px] flex-col justify-end p-8">
                                    <div className="mb-4 flex flex-wrap items-center gap-3">
                                        <span className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] ${getStatusTone(tournament.status)}`}>
                                            {tournament.status}
                                        </span>
                                        <span className="rounded-full border border-white/15 bg-black/25 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                                            {tournament.format}
                                        </span>
                                        <span className="rounded-full border border-white/15 bg-black/25 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                                            {tournament.gameType === "MASTER_DUEL" ? "Master Duel" : "Duel Links"}
                                        </span>
                                    </div>
                                    <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-5xl">{tournament.title}</h1>
                                    <p className="mt-4 max-w-3xl text-base leading-7 text-white/60">
                                        {tournament.description?.trim() || "Tournament komunitas Duel Standby dengan bracket kompetitif, jadwal terstruktur, dan ruang untuk pemain terbaik naik panggung."}
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4 p-6 md:grid-cols-4">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">Jadwal</div>
                                    <div className="text-sm font-semibold text-white/85">{formatDate(tournament.startDate)}</div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">Prize Pool</div>
                                    <div className="text-sm font-semibold text-[#FFC916]">{formatCurrency(tournament.prizePool)}</div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">Entry Fee</div>
                                    <div className="text-sm font-semibold text-white/85">{tournament.entryFee > 0 ? formatCurrency(tournament.entryFee) : "Free Entry"}</div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">Participants</div>
                                    <div className="text-sm font-semibold text-white/85">{tournament.participants.length} pemain</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-[28px] border border-white/10 bg-[#171717] p-6">
                                <div className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-[#FFC916]">Registration</div>
                                <h2 className="mb-2 text-2xl font-black">Aksi Tournament</h2>
                                <p className="mb-5 text-sm leading-6 text-white/55">
                                    Detail view lebih cocok sebagai halaman penuh daripada popup karena bisa menampung info bracket, peserta, jadwal, dan CTA tanpa terasa sempit, terutama di mobile.
                                </p>
                                <TournamentRegisterButton tournamentId={tournament.id} disabled={tournament.status !== "OPEN"} />
                            </div>

                            <div className="rounded-[28px] border border-white/10 bg-[#171717] p-6">
                                <div className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-[#FFC916]">Participant Lobby</div>
                                {tournament.participants.length === 0 ? (
                                    <p className="text-sm text-white/55">Belum ada peserta terdaftar. Jadilah yang pertama masuk bracket ini.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {tournament.participants.map((participant, index) => (
                                            <div key={participant.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFC916] font-black text-[#111111]">
                                                        {participant.user.fullName.slice(0, 1).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-white">{participant.user.fullName}</div>
                                                        <div className="text-xs text-white/45">{participant.gameId}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right text-xs text-white/45">
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
