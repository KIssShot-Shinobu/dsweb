import { notFound } from "next/navigation";
import { TeamManageClient } from "@/components/teams/team-manage-client";
import { TeamRequestPanel } from "@/components/teams/team-request-panel";
import type { TeamView } from "@/components/teams/types";
import {
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { dashboardStackCls } from "@/components/dashboard/form-styles";
import { requireDashboardUser } from "@/lib/dashboard-auth";
import { prisma } from "@/lib/prisma";
import { createTeamService } from "@/lib/services/team.service";
import { isTeamRosterLocked } from "@/lib/team-roster-lock";
import { getServerLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

const teamService = createTeamService();

export default async function MyTeamPage() {
    const locale = await getServerLocale();
    const t = getDictionary(locale);
    const user = await requireDashboardUser();

    const activeMembership = await prisma.teamMember.findFirst({
        where: { userId: user.id, leftAt: null },
        select: {
            team: {
                select: {
                    slug: true,
                },
            },
        },
    });

    if (!activeMembership?.team?.slug) {
        return (
            <DashboardPageShell>
                <div className={dashboardStackCls}>
                    <DashboardPageHeader
                        kicker={t.dashboard.myTeam.kicker}
                        title={t.dashboard.myTeam.title}
                        description={t.dashboard.myTeam.description}
                    />
                    <DashboardPanel title={t.dashboard.myTeam.emptyPanelTitle} description={t.dashboard.myTeam.emptyPanelDescription}>
                        <TeamRequestPanel />
                    </DashboardPanel>
                </div>
            </DashboardPageShell>
        );
    }

    const team = await teamService.getTeamBySlug(activeMembership.team.slug, user.id);

    if (!team) {
        notFound();
    }

    const canInvite = team.permissions.canInvite;
    const candidates = canInvite
        ? await prisma.user.findMany({
              where: {
                  deletedAt: null,
                  status: "ACTIVE",
                  id: { not: user.id },
                  teamMemberships: {
                      none: { leftAt: null },
                  },
              },
              select: {
                  id: true,
                  fullName: true,
                  username: true,
                  email: true,
                  avatarUrl: true,
              },
              orderBy: [{ fullName: "asc" }],
              take: 100,
          })
        : [];

    return (
        <DashboardPageShell>
            <TeamManageClient
                team={team as TeamView}
                candidates={candidates}
                returnHref="/dashboard/team"
                rosterLocked={await isTeamRosterLocked(prisma, team.id)}
            />
        </DashboardPageShell>
    );
}
