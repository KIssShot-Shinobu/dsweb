import { DashboardEmptyState, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { dashboardStackCls } from "@/components/dashboard/form-styles";
import { TournamentMyMatch } from "@/components/public/tournament-my-match";
import { getAppUrl } from "@/lib/runtime-config";
import { getServerDictionary } from "@/lib/i18n/server";
import { findActiveWorkspaceMatch } from "@/lib/my-tournament-workspace";
import { getTournamentWorkspaceOrRedirect } from "../workspace";

export default async function MyTournamentMatchChatPage({ params }: { params: Promise<{ id: string }> }) {
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
                    title={t.dashboard.tournamentPlayerShell.nav.matchChat}
                    description={t.dashboard.myTournaments.workspace.matchChatDescription}
                />
                <DashboardPanel
                    title={t.dashboard.tournamentPlayerShell.nav.matchChat}
                    description={t.dashboard.myTournaments.workspace.matchChatDescription}
                >
                    {!match ? (
                        <DashboardEmptyState
                            title={t.dashboard.myTournaments.workspace.noMatchTitle}
                            description={t.dashboard.myTournaments.workspace.noMatchDescription}
                        />
                    ) : (
                        <TournamentMyMatch
                            match={match}
                            currentUserId={user.id}
                            tournamentTitle={tournament.title}
                            tournamentUrl={`${getAppUrl()}/tournaments/${tournament.id}`}
                            tournamentTimeZone={timezone}
                            view="chat"
                        />
                    )}
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
