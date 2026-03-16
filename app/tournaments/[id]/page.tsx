import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { TournamentRegisterButton } from "@/components/public/tournament-register-button";
import { TournamentBracketSection } from "@/components/public/tournament-bracket-section";
import { prisma } from "@/lib/prisma";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { resolveTournamentImage } from "@/lib/tournament-image";
import { getCurrentUser } from "@/lib/auth";

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
    if (status === "OPEN") return "badge-success";
    if (status === "ONGOING") return "badge-warning";
    if (status === "COMPLETED") return "badge-info";
    return "badge-ghost";
}

function getStatusLabel(status: string) {
    if (status === "OPEN") return "Registrasi Dibuka";
    if (status === "ONGOING") return "Sedang Berlangsung";
    if (status === "COMPLETED") return "Selesai";
    if (status === "CANCELLED") return "Dibatalkan";
    return status;
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            game: { select: { code: true, name: true } },
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
    const isRegistered = currentUser
        ? tournament.participants.some((participant) => participant.userId === currentUser.id)
        : false;
    const participantCount = tournament.participants.length;
    const maxPlayers = tournament.maxPlayers ?? null;
    const isFull = Boolean(maxPlayers && participantCount >= maxPlayers);

    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto max-w-[1400px] px-4 pb-14 sm:px-6 lg:px-8">
                    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="card overflow-hidden border border-base-300 bg-base-100 shadow-2xl">
                            <div className="relative min-h-[320px] border-b border-base-300 bg-gradient-to-br from-info/20 via-base-200 to-warning/15">
                                {imageUrl ? (
                                    <Image
                                        unoptimized
                                        fill
                                        sizes="100vw"
                                        src={imageUrl}
                                        alt={tournament.title}
                                        className="absolute inset-0 h-full w-full object-cover opacity-30"
                                    />
                                ) : null}
                                <div className="absolute inset-0 bg-base-100/78" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,201,22,0.18),transparent_34%)]" />
                                <div className="relative flex min-h-[320px] flex-col justify-end p-8">
                                    <div className="mb-4 flex flex-wrap items-center gap-3">
                                        <span className={`badge h-auto px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] ${getStatusTone(tournament.status)}`}>
                                            {getStatusLabel(tournament.status)}
                                        </span>
                                        <span className="badge badge-outline h-auto px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em]">
                                            {tournament.format}
                                        </span>
                                        <span className="badge badge-outline h-auto px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em]">
                                            {tournament.game?.name ?? "Game"}
                                        </span>
                                    </div>
                                    <h1 className="max-w-4xl text-4xl font-black leading-tight text-base-content sm:text-5xl">{tournament.title}</h1>
                                    <p className="mt-4 max-w-3xl text-base leading-7 text-base-content/65">
                                        {tournament.description?.trim() || "Event komunitas Duel Standby dengan informasi yang jelas, ritme kompetitif yang sehat, dan pengalaman bermain yang lebih terstruktur."}
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4 p-6 md:grid-cols-4">
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">Jadwal Event</div>
                                    <div className="text-sm font-semibold text-base-content">{formatDate(tournament.startAt)}</div>
                                </div>
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">Prize Pool</div>
                                    <div className="text-sm font-semibold text-primary">{formatCurrency(tournament.prizePool)}</div>
                                </div>
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">Biaya Masuk</div>
                                    <div className="text-sm font-semibold text-base-content">{tournament.entryFee > 0 ? formatCurrency(tournament.entryFee) : "Tanpa biaya"}</div>
                                </div>
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">Peserta Terdaftar</div>
                                    <div className="text-sm font-semibold text-base-content">
                                        {maxPlayers ? `${participantCount} / ${maxPlayers}` : `${participantCount} pemain`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="card border border-base-300 bg-base-100 shadow-xl lg:sticky lg:top-28">
                                <div className="card-body space-y-6 p-6">
                                    <div>
                                        <div className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-primary">Pendaftaran</div>
                                        <h2 className="mb-2 text-2xl font-black text-base-content">Amankan slot Anda</h2>
                                        <p className="mb-5 text-sm leading-6 text-base-content/60">
                                            Pelajari detail event, pastikan formatnya sesuai, lalu daftar langsung selama registrasi masih dibuka.
                                        </p>
                                        <TournamentRegisterButton
                                            tournamentId={tournament.id}
                                            disabled={tournament.status !== "OPEN" || isFull}
                                            isFull={isFull}
                                            isRegistered={isRegistered}
                                        />
                                    </div>

                                    <div className="divider my-1" />

                                    <div>
                                        <div className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-primary">Roster Peserta</div>
                                        {tournament.participants.length === 0 ? (
                                            <p className="text-sm text-base-content/60">Belum ada peserta terdaftar. Jadilah yang pertama mengisi bracket ini.</p>
                                        ) : (
                                            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                                {tournament.participants.map((participant, index) => {
                                                    const displayName = participant.user?.fullName || participant.guestName || "Guest";
                                                    const roleLabel = participant.user?.role || "Guest";
                                                    const avatarUrl = participant.user?.avatarUrl ? normalizeAssetUrl(participant.user.avatarUrl) : null;

                                                    return (
                                                        <div key={participant.id} className="flex items-center justify-between rounded-box border border-base-300 bg-base-200/40 px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                {avatarUrl ? (
                                                                    <Image
                                                                        unoptimized
                                                                        src={avatarUrl}
                                                                        alt={displayName}
                                                                        width={40}
                                                                        height={40}
                                                                        className="h-10 w-10 rounded-full border border-base-300 object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="badge badge-primary h-10 w-10 rounded-full border-0 font-black text-primary-content">
                                                                        {displayName.slice(0, 1).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <div className="font-semibold text-base-content">{displayName}</div>
                                                                        {!participant.user ? (
                                                                            <span className="badge badge-outline badge-sm">Guest</span>
                                                                        ) : null}
                                                                    </div>
                                                                    <div className="text-xs text-base-content/50">{participant.gameId}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right text-xs text-base-content/50">
                                                                <div>#{String(index + 1).padStart(2, "0")}</div>
                                                                <div>{roleLabel}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-b border-base-300 py-16">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
                    <div className="card border border-base-300 bg-base-100 shadow-xl">
                        <div className="card-body gap-6 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Bracket</div>
                                    <h2 className="mt-2 text-2xl font-black text-base-content">Rangkaian Pertandingan</h2>
                                    <p className="mt-2 text-sm text-base-content/60">Pantau progress pertandingan dan status setiap match secara real-time.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                                    <span className="badge badge-outline">{tournament.structure.replace("_", " ")}</span>
                                    <span className="badge badge-outline">{tournament.format}</span>
                                </div>
                            </div>
                            <TournamentBracketSection tournamentId={tournament.id} structure={tournament.structure} />
                        </div>
                    </div>
                </div>
            </section>
            <Footer />
        </main>
    );
}
