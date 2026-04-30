import Link from "next/link";
import {
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, dashboardStackCls } from "@/components/dashboard/form-styles";
import { requireDashboardUser } from "@/lib/dashboard-auth";
import { getServerDictionary } from "@/lib/i18n/server";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { prisma } from "@/lib/prisma";

const TOURNAMENT_STATUS_BADGE: Record<string, string> = {
    OPEN: "badge-info",
    ONGOING: "badge-warning",
    COMPLETED: "badge-success",
    CANCELLED: "badge-ghost",
};

const PARTICIPANT_STATUS_BADGE: Record<string, string> = {
    REGISTERED: "badge-primary",
    CHECKED_IN: "badge-success",
    DISQUALIFIED: "badge-error",
    PLAYING: "badge-warning",
    WAITLIST: "badge-ghost",
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
    VERIFIED: "badge-success",
    PENDING: "badge-warning",
    REJECTED: "badge-error",
};

export default async function MyTournamentsPage() {
    const { locale, t } = await getServerDictionary();
    const user = await requireDashboardUser();

    const entries = await prisma.tournamentParticipant.findMany({
        where: user.teamId
            ? {
                  OR: [
                      { userId: user.id },
                      { teamId: user.teamId },
                  ],
              }
            : { userId: user.id },
        select: {
            id: true,
            tournamentId: true,
            status: true,
            paymentStatus: true,
            joinedAt: true,
            teamId: true,
            guestName: true,
            gameId: true,
            team: {
                select: {
                    name: true,
                },
            },
            tournament: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    startAt: true,
                    entryFee: true,
                    isTeamTournament: true,
                    mode: true,
                    game: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: [{ joinedAt: "desc" }],
    });

    const totalJoined = entries.length;
    const teamEntries = entries.filter((entry) => Boolean(entry.teamId)).length;
    const paymentPending = entries.filter(
        (entry) => entry.tournament.entryFee > 0 && entry.paymentStatus === "PENDING"
    ).length;

    return (
        <DashboardPageShell>
            <div className={dashboardStackCls}>
                <DashboardPageHeader
                    kicker={t.dashboard.myTournaments.kicker}
                    title={t.dashboard.myTournaments.title}
                    description={t.dashboard.myTournaments.description}
                    actions={(
                        <Link href="/tournaments" className={btnOutline}>
                            {t.dashboard.myTournaments.browseTournament}
                        </Link>
                    )}
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <DashboardMetricCard label={t.dashboard.myTournaments.stats.total} value={totalJoined} />
                    <DashboardMetricCard label={t.dashboard.myTournaments.stats.teamEntries} value={teamEntries} />
                    <DashboardMetricCard
                        label={t.dashboard.myTournaments.stats.paymentPending}
                        value={paymentPending}
                        tone={paymentPending > 0 ? "danger" : "success"}
                    />
                </div>

                <DashboardPanel
                    title={t.dashboard.myTournaments.title}
                    description={t.dashboard.myTournaments.description}
                >
                    {entries.length === 0 ? (
                        <DashboardEmptyState
                            title={t.dashboard.myTournaments.emptyTitle}
                            description={t.dashboard.myTournaments.emptyDescription}
                            actionHref="/tournaments"
                            actionLabel={t.dashboard.myTournaments.browseTournament}
                        />
                    ) : (
                        <div className="space-y-3">
                            {entries.map((entry) => {
                                const tournamentStatusLabel =
                                    t.tournament.status[entry.tournament.status as keyof typeof t.tournament.status] ?? entry.tournament.status;
                                const participantStatusLabel =
                                    t.dashboard.myTournaments.participantStatus[
                                        entry.status as keyof typeof t.dashboard.myTournaments.participantStatus
                                    ] ?? entry.status;
                                const paymentStatusLabel =
                                    t.dashboard.myTournaments.paymentStatus[
                                        entry.paymentStatus as keyof typeof t.dashboard.myTournaments.paymentStatus
                                    ] ?? entry.paymentStatus;
                                const registrationTypeLabel = entry.teamId
                                    ? t.dashboard.myTournaments.registrationType.team
                                    : t.dashboard.myTournaments.registrationType.individual;
                                const teamName = entry.team?.name || entry.guestName || entry.gameId;

                                return (
                                    <article key={entry.id} className="rounded-box border border-base-300 bg-base-200/40 p-4 shadow-sm">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0 space-y-2">
                                                <div className="text-base font-bold text-base-content">{entry.tournament.title}</div>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className={`badge ${TOURNAMENT_STATUS_BADGE[entry.tournament.status] ?? "badge-ghost"}`}>
                                                        {tournamentStatusLabel}
                                                    </span>
                                                    <span className="badge badge-outline">{registrationTypeLabel}</span>
                                                    <span className={`badge ${PARTICIPANT_STATUS_BADGE[entry.status] ?? "badge-ghost"}`}>
                                                        {participantStatusLabel}
                                                    </span>
                                                    {entry.tournament.entryFee > 0 ? (
                                                        <span className={`badge ${PAYMENT_STATUS_BADGE[entry.paymentStatus] ?? "badge-ghost"}`}>
                                                            {paymentStatusLabel}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="text-sm text-base-content/70">
                                                    {t.dashboard.myTournaments.labels.game}: {entry.tournament.game.name}
                                                </div>
                                                {entry.teamId ? (
                                                    <div className="text-sm text-base-content/70">{teamName}</div>
                                                ) : null}
                                                <div className="text-xs text-base-content/55">
                                                    {t.dashboard.myTournaments.labels.joinedAt(formatDate(entry.joinedAt, locale))}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-start gap-3 lg:items-end">
                                                <div className="text-sm font-semibold text-base-content">
                                                    {t.dashboard.myTournaments.labels.entryFee}:{" "}
                                                    {entry.tournament.entryFee > 0
                                                        ? formatCurrency(entry.tournament.entryFee, locale)
                                                        : t.tournament.freeEntry}
                                                </div>
                                                <div className="text-xs text-base-content/55">
                                                    {formatDate(entry.tournament.startAt, locale)}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Link href={`/dashboard/my-tournaments/${entry.tournament.id}/your-match`} className={`${btnPrimary} btn-sm`}>
                                                        {t.dashboard.myTournaments.openWorkspace}
                                                    </Link>
                                                    <Link href={`/tournaments/${entry.tournament.id}`} className={`${btnOutline} btn-sm`}>
                                                        {t.dashboard.myTournaments.viewPublic}
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
