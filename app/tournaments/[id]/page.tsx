import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { TournamentRegisterButton } from "@/components/public/tournament-register-button";
import { TournamentBracketSection } from "@/components/public/tournament-bracket-section";
import { TournamentMyMatch } from "@/components/public/tournament-my-match";
import { prisma } from "@/lib/prisma";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { resolveTournamentImage } from "@/lib/tournament-image";
import { getCurrentUser } from "@/lib/auth";
import { formatLocalDateTime } from "@/lib/datetime";

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

function resolveParticipantName(participant?: { guestName: string | null; user?: { fullName: string | null; username: string | null } | null }) {
    if (!participant) return "TBD";
    return participant.user?.username || participant.user?.fullName || participant.guestName || "TBD";
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
    const isTeamTournament = Boolean(tournament.isTeamTournament || tournament.mode !== "INDIVIDUAL");
    const participantForUser = currentUser
        ? tournament.participants.find((participant) =>
              isTeamTournament
                  ? participant.teamId && currentUser.teamId && participant.teamId === currentUser.teamId
                  : participant.userId === currentUser.id
          )
        : null;
    const isRegistered = Boolean(participantForUser);
    const activeParticipants = tournament.participants.filter((participant) => !["WAITLIST", "DISQUALIFIED"].includes(participant.status));
    const participantCount = activeParticipants.length;
    const waitlistCount = tournament.participants.filter((participant) => participant.status === "WAITLIST").length;
    const maxPlayers = tournament.maxPlayers ?? null;
    const isFull = Boolean(maxPlayers && participantCount >= maxPlayers);
    const rosterParticipants =
        tournament.entryFee > 0
            ? tournament.participants.filter((participant) => participant.paymentStatus === "VERIFIED" && participant.status !== "WAITLIST")
            : tournament.participants.filter((participant) => participant.status !== "WAITLIST");
    const paymentNotifications = currentUser
        ? await prisma.notification.findMany({
              where: {
                  userId: currentUser.id,
                  link: `/tournaments/${tournament.id}`,
              },
              orderBy: { createdAt: "desc" },
              take: 3,
          })
        : [];

    const myMatch = currentUser && participantForUser
        ? await prisma.match.findFirst({
              where: {
                  tournamentId: id,
                  status: { not: "COMPLETED" },
                  OR: [{ playerAId: participantForUser.id }, { playerBId: participantForUser.id }],
              },
              orderBy: [{ round: { roundNumber: "asc" } }, { bracketIndex: "asc" }],
              select: {
                  id: true,
                  status: true,
                  scheduledAt: true,
                  playerA: { select: { id: true, guestName: true, user: { select: { fullName: true, username: true } } } },
                  playerB: { select: { id: true, guestName: true, user: { select: { fullName: true, username: true } } } },
                  reports: {
                      where: { reportedById: currentUser.id },
                      select: { scoreA: true, scoreB: true, winnerId: true, evidenceUrls: true },
                      orderBy: { createdAt: "desc" },
                      take: 1,
                  },
                  disputes: {
                      where: { status: "OPEN" },
                      select: { reason: true, evidenceUrls: true },
                      orderBy: { createdAt: "desc" },
                      take: 1,
                  },
              },
          })
        : null;

    const myMatchPayload = myMatch
        ? {
              id: myMatch.id,
              status: myMatch.status,
              scheduledAt: myMatch.scheduledAt ? formatLocalDateTime(myMatch.scheduledAt) : null,
              playerA: myMatch.playerA ? { id: myMatch.playerA.id, name: resolveParticipantName(myMatch.playerA) } : null,
              playerB: myMatch.playerB ? { id: myMatch.playerB.id, name: resolveParticipantName(myMatch.playerB) } : null,
              report: myMatch.reports[0]
                  ? {
                        scoreA: myMatch.reports[0].scoreA,
                        scoreB: myMatch.reports[0].scoreB,
                        winnerId: myMatch.reports[0].winnerId,
                        evidenceUrls: Array.isArray(myMatch.reports[0].evidenceUrls)
                            ? myMatch.reports[0].evidenceUrls
                            : null,
                    }
                  : null,
              hasOpenDispute: myMatch.disputes.length > 0,
              disputeReason: myMatch.disputes[0]?.reason ?? null,
          }
        : null;

    const renderPaymentStatus = () => {
        if (!participantForUser || tournament.entryFee <= 0) return null;
        const status = participantForUser.paymentStatus;
        const badgeClass =
            status === "VERIFIED" ? "badge-success" : status === "REJECTED" ? "badge-error" : "badge-warning";
        const label =
            status === "VERIFIED" ? "Terverifikasi" : status === "REJECTED" ? "Ditolak" : "Menunggu Verifikasi";
        const verifiedAtLabel = participantForUser.paymentVerifiedAt
            ? new Date(participantForUser.paymentVerifiedAt).toLocaleString("id-ID")
            : null;
        return (
            <div className="rounded-box border border-base-300 bg-base-200/50 p-4 text-sm">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">
                    Status Pembayaran
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <span className={`badge ${badgeClass}`}>{label}</span>
                    {participantForUser.paymentProofUrl ? (
                        <a
                            className="btn btn-outline btn-xs"
                            href={normalizeAssetUrl(participantForUser.paymentProofUrl) || "#"}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Lihat Bukti
                        </a>
                    ) : null}
                </div>
                {verifiedAtLabel && status === "VERIFIED" ? (
                    <p className="mt-2 text-xs text-base-content/60">Terverifikasi pada {verifiedAtLabel}</p>
                ) : null}
                {status === "REJECTED" ? (
                    <p className="mt-2 text-xs text-base-content/60">
                        Bukti pembayaran ditolak. Silakan upload ulang bukti pembayaran di tombol registrasi.
                    </p>
                ) : null}
            </div>
        );
    };

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
                                    {waitlistCount > 0 ? (
                                        <div className="mt-2 text-xs text-base-content/60">{waitlistCount} di waitlist</div>
                                    ) : null}
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
                                            disabled={tournament.status !== "OPEN"}
                                            isFull={isFull}
                                            isRegistered={isRegistered}
                                            entryFee={tournament.entryFee}
                                            paymentStatus={participantForUser?.paymentStatus ?? null}
                                            participantStatus={participantForUser?.status ?? null}
                                        />
                                        {renderPaymentStatus()}
                                        {paymentNotifications.length > 0 ? (
                                            <div className="rounded-box border border-base-300 bg-base-200/50 p-4 text-sm">
                                                <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">
                                                    Notifikasi Pembayaran
                                                </div>
                                                <div className="space-y-2 text-xs text-base-content/70">
                                                    {paymentNotifications.map((notification) => (
                                                        <div key={notification.id} className="rounded-box border border-base-300 bg-base-100/80 px-3 py-2">
                                                            <div className="font-semibold text-base-content">{notification.title}</div>
                                                            <div className="text-[11px] text-base-content/55">{notification.message}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                        {myMatchPayload ? (
                                            <>
                                                <div className="divider my-1" />
                                                <TournamentMyMatch match={myMatchPayload} currentUserId={currentUser?.id ?? null} />
                                            </>
                                        ) : null}
                                    </div>

                                    <div className="divider my-1" />

                                    <div>
                                        <div className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-primary">Roster Peserta</div>
                                        {rosterParticipants.length === 0 ? (
                                            <p className="text-sm text-base-content/60">Belum ada peserta terdaftar. Jadilah yang pertama mengisi bracket ini.</p>
                                        ) : (
                                            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                                {rosterParticipants.map((participant, index) => {
                                                    const displayName = participant.user?.username || participant.user?.fullName || participant.guestName || "Guest";
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
