import Link from "next/link";
import {
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { btnOutline, btnPrimary, dashboardStackCls } from "@/components/dashboard/form-styles";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { getServerDictionary } from "@/lib/i18n/server";
import { findActiveWorkspaceMatch } from "@/lib/my-tournament-workspace";
import { getTournamentWorkspaceOrRedirect } from "./workspace";

export default async function MyTournamentWorkspaceOverviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { locale, t } = await getServerDictionary();
    const { user, tournament, participant, timezone } = await getTournamentWorkspaceOrRedirect(id);
    const match = await findActiveWorkspaceMatch({
        tournamentId: id,
        participantId: participant.id,
        userId: user.id,
        locale,
        timezone,
    });

    return (
        <DashboardPageShell>
            <div className={dashboardStackCls}>
                <DashboardPageHeader
                    kicker={t.dashboard.myTournaments.workspace.kicker}
                    title={t.dashboard.myTournaments.workspace.title}
                    description={t.dashboard.myTournaments.workspace.description}
                    actions={
                        <>
                            <Link href={`/tournaments/${id}`} className={btnOutline}>
                                {t.dashboard.myTournaments.viewPublic}
                            </Link>
                            <Link href={`/dashboard/my-tournaments/${id}/your-match`} className={btnPrimary}>
                                {t.dashboard.myTournaments.workspace.openYourMatch}
                            </Link>
                        </>
                    }
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <DashboardMetricCard label={t.dashboard.myTournaments.workspace.metrics.status} value={tournament.status} />
                    <DashboardMetricCard
                        label={t.dashboard.myTournaments.workspace.metrics.entryFee}
                        value={tournament.entryFee > 0 ? formatCurrency(tournament.entryFee, locale) : t.tournament.freeEntry}
                    />
                    <DashboardMetricCard label={t.dashboard.myTournaments.workspace.metrics.paymentStatus} value={participant.paymentStatus} />
                </div>

                <DashboardPanel title={tournament.title} description={t.dashboard.myTournaments.workspace.panelDescription}>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                            <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">
                                {t.dashboard.myTournaments.workspace.labels.tournamentInfo}
                            </div>
                            <div className="mt-3 space-y-2 text-sm text-base-content/75">
                                <div>{t.dashboard.myTournaments.labels.game}: {tournament.game.name}</div>
                                <div>{t.dashboard.myTournaments.workspace.labels.format}: {tournament.format}</div>
                                <div>{t.dashboard.myTournaments.workspace.labels.structure}: {tournament.structure}</div>
                                <div>{t.dashboard.myTournaments.workspace.labels.startAt}: {formatDate(tournament.startAt, locale)}</div>
                            </div>
                        </div>
                        <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
                            <div className="text-xs font-bold uppercase tracking-[0.2em] text-base-content/50">
                                {t.dashboard.myTournaments.workspace.labels.quickAccess}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Link href={`/dashboard/my-tournaments/${id}/your-match`} className={`${btnOutline} btn-sm`}>
                                    {t.dashboard.tournamentPlayerShell.nav.yourMatch}
                                </Link>
                                <Link href={`/dashboard/my-tournaments/${id}/match-report`} className={`${btnOutline} btn-sm`}>
                                    {t.dashboard.tournamentPlayerShell.nav.matchReport}
                                </Link>
                                <Link href={`/dashboard/my-tournaments/${id}/open-dispute`} className={`${btnOutline} btn-sm`}>
                                    {t.dashboard.tournamentPlayerShell.nav.openDispute}
                                </Link>
                                <Link href={`/dashboard/my-tournaments/${id}/match-chat`} className={`${btnOutline} btn-sm`}>
                                    {t.dashboard.tournamentPlayerShell.nav.matchChat}
                                </Link>
                            </div>
                        </div>
                    </div>
                </DashboardPanel>

                {!match ? (
                    <DashboardPanel
                        title={t.dashboard.myTournaments.workspace.noMatchTitle}
                        description={t.dashboard.myTournaments.workspace.noMatchDescription}
                    >
                        <DashboardEmptyState
                            title={t.dashboard.myTournaments.workspace.noMatchTitle}
                            description={t.dashboard.myTournaments.workspace.noMatchDescription}
                            actionHref={`/tournaments/${id}`}
                            actionLabel={t.dashboard.myTournaments.viewPublic}
                        />
                    </DashboardPanel>
                ) : null}
            </div>
        </DashboardPageShell>
    );
}
