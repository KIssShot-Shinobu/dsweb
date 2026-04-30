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
import { formatDisplayDateTimeInTimeZone } from "@/lib/datetime";
import { DEFAULT_TIMEZONE } from "@/lib/timezones";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar";
import { getAppUrl } from "@/lib/runtime-config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import { formatCurrency } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";


export async function generateMetadata({ params }: { params: { id: string } }) {
    return {
        alternates: {
            canonical: `/tournaments/${encodeURIComponent(params.id)}`,
        },
    };
}

function formatDate(value: Date, timeZone: string, locale: Locale) {
    return formatDisplayDateTimeInTimeZone(value, timeZone, locale);
}

function getStatusTone(status: string) {
    if (status === "OPEN") return "badge-success";
    if (status === "ONGOING") return "badge-warning";
    if (status === "COMPLETED") return "badge-info";
    return "badge-ghost";
}

function getStatusLabel(status: string, labels: Record<string, string>) {
    return labels[status] ?? status;
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const locale = await getServerLocale();
    const t = getDictionary(locale);
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

    const tournamentTimeZone = tournament.timezone ?? DEFAULT_TIMEZONE;
    const appUrl = getAppUrl();
    const tournamentUrl = `${appUrl}/tournaments/${tournament.id}`;
    const tournamentCalendarUrl = tournament.startAt
        ? buildGoogleCalendarUrl({
              title: tournament.title,
              start: tournament.startAt,
              end: new Date(tournament.startAt.getTime() + 120 * 60 * 1000),
              details: `${t.tournamentDetail.calendarTitle}: ${tournament.title}\n${tournamentUrl}`,
              timeZone: tournamentTimeZone,
          })
        : null;
    const renderPaymentStatus = () => {
        if (!participantForUser || tournament.entryFee <= 0) return null;
        const status = participantForUser.paymentStatus;
        const badgeClass =
            status === "VERIFIED" ? "badge-success" : status === "REJECTED" ? "badge-error" : "badge-warning";
        const label =
            status === "VERIFIED"
                ? t.tournamentDetail.paymentVerified
                : status === "REJECTED"
                  ? t.tournamentDetail.paymentRejected
                  : t.tournamentDetail.paymentPending;
        const verifiedAtLabel = participantForUser.paymentVerifiedAt
            ? formatDisplayDateTimeInTimeZone(participantForUser.paymentVerifiedAt, tournamentTimeZone, locale)
            : null;
        return (
            <div className="rounded-box border border-base-300 bg-base-200/50 p-4 text-sm">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">
                    {t.tournamentDetail.paymentStatusTitle}
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
                            {t.tournamentDetail.viewProof}
                        </a>
                    ) : null}
                </div>
                {verifiedAtLabel && status === "VERIFIED" ? (
                    <p className="mt-2 text-xs text-base-content/60">{t.tournamentDetail.verifiedAtLabel(verifiedAtLabel)}</p>
                ) : null}
                {status === "REJECTED" ? (
                    <p className="mt-2 text-xs text-base-content/60">
                        {t.tournamentDetail.paymentRejectedNote}
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
                                            {getStatusLabel(tournament.status, t.tournament.status as Record<string, string>)}
                                        </span>
                                        <span className="badge badge-outline h-auto px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em]">
                                            {tournament.format}
                                        </span>
                                        <span className="badge badge-outline h-auto px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em]">
                                            {tournament.game?.name ?? t.tournamentDetail.gameFallback}
                                        </span>
                                    </div>
                                    <h1 className="max-w-4xl text-4xl font-black leading-tight text-base-content sm:text-5xl">{tournament.title}</h1>
                                    <p className="mt-4 max-w-3xl text-base leading-7 text-base-content/65">
                                        {tournament.description?.trim() || t.tournamentDetail.defaultDescription}
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4 p-6 md:grid-cols-4">
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">{t.tournament.scheduleLabel}</div>
                                    <div className="text-sm font-semibold text-base-content">{formatDate(tournament.startAt, tournamentTimeZone, locale)}</div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {tournamentCalendarUrl ? (
                                            <a className="btn btn-primary btn-xs" href={tournamentCalendarUrl} target="_blank" rel="noreferrer">
                                                {t.tournamentDetail.addToCalendar}
                                            </a>
                                        ) : null}
                                        <a
                                            className="btn btn-outline btn-xs"
                                            href={`/api/tournaments/${tournament.id}/calendar`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {t.tournamentDetail.downloadIcs}
                                        </a>
                                    </div>
                                </div>
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">{t.tournament.prizePoolLabel}</div>
                                    <div className="text-sm font-semibold text-primary">{formatCurrency(tournament.prizePool, locale)}</div>
                                </div>
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">{t.tournamentDetail.entryFeeLabel}</div>
                                    <div className="text-sm font-semibold text-base-content">{tournament.entryFee > 0 ? formatCurrency(tournament.entryFee, locale) : t.tournament.freeEntry}</div>
                                </div>
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">{t.tournamentDetail.participantsLabel}</div>
                                    <div className="text-sm font-semibold text-base-content">
                                        {maxPlayers ? t.tournamentDetail.participantsCount(participantCount, maxPlayers) : t.tournamentDetail.participantsOnly(participantCount)}
                                    </div>
                                    {waitlistCount > 0 ? (
                                        <div className="mt-2 text-xs text-base-content/60">{t.tournamentDetail.waitlistLabel(waitlistCount)}</div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="card border border-base-300 bg-base-100 shadow-xl lg:sticky lg:top-28">
                                <div className="card-body space-y-6 p-6">
                                    <div>
                                        <div className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-primary">{t.tournamentDetail.registrationBadge}</div>
                                        <h2 className="mb-2 text-2xl font-black text-base-content">{t.tournamentDetail.registrationTitle}</h2>
                                        <p className="mb-5 text-sm leading-6 text-base-content/60">
                                            {t.tournamentDetail.registrationSubtitle}
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
                                        {currentUser && isRegistered ? (
                                            <Link href={`/dashboard/my-tournaments/${tournament.id}/your-match`} className="btn btn-outline mt-3 w-full">
                                                {t.tournamentDetail.openWorkspace}
                                            </Link>
                                        ) : null}
                                        {paymentNotifications.length > 0 ? (
                                            <div className="rounded-box border border-base-300 bg-base-200/50 p-4 text-sm">
                                                <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">
                                                    {t.tournamentDetail.paymentNotifications}
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
                                    </div>

                                    <div className="divider my-1" />

                                    <div>
                                        <div className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-primary">{t.tournamentDetail.rosterTitle}</div>
                                        {rosterParticipants.length === 0 ? (
                                            <p className="text-sm text-base-content/60">{t.tournamentDetail.rosterEmpty}</p>
                                        ) : (
                                            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                                {rosterParticipants.map((participant, index) => {
                                                    const displayName = participant.user?.username || participant.user?.fullName || participant.guestName || t.tournamentDetail.guestLabel;
                                                    const roleLabel = participant.user?.role || t.tournamentDetail.guestLabel;
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
                                                                            <span className="badge badge-outline badge-sm">{t.tournamentDetail.guestLabel}</span>
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
                                    <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">{t.tournamentDetail.bracketBadge}</div>
                                    <h2 className="mt-2 text-2xl font-black text-base-content">{t.tournamentDetail.bracketTitle}</h2>
                                    <p className="mt-2 text-sm text-base-content/60">{t.tournamentDetail.bracketSubtitle}</p>
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
