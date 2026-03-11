import { notFound } from "next/navigation";
import { TeamManageClient } from "@/components/teams/team-manage-client";
import { TeamRequestPanel } from "@/components/teams/team-request-panel";
import type { TeamView } from "@/components/teams/types";
import {
    DashboardEmptyState,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";
import { requireDashboardUser } from "@/lib/dashboard-auth";
import { prisma } from "@/lib/prisma";
import { createTeamService } from "@/lib/services/team.service";

const teamService = createTeamService();

export default async function MyTeamPage() {
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
                <DashboardPageHeader
                    kicker="Team"
                    title="Team Saya"
                    description="Kelola roster dan info team langsung dari dashboard."
                />
                <DashboardPanel title="Belum Terhubung Team" description="Anda belum punya team aktif saat ini.">
                    <TeamRequestPanel />
                </DashboardPanel>
            </DashboardPageShell>
        );
    }

    const team = await teamService.getTeamBySlug(activeMembership.team.slug, user.id);

    if (!team) {
        notFound();
    }

    const canManage =
        team.viewerMembership &&
        (team.permissions.canEditTeam ||
            team.permissions.canInvite ||
            team.permissions.canPromote ||
            team.permissions.canTransferCaptain);

    if (!canManage) {
        return (
            <DashboardPageShell>
                <DashboardPageHeader
                    kicker="Team"
                    title="Team Saya"
                    description="Hanya captain dan pengurus team yang ditunjuk bisa mengelola roster."
                />
                <DashboardPanel title="Akses Terbatas" description="Role Anda belum punya izin manajemen team.">
                    <DashboardEmptyState
                        title="Tidak punya akses"
                        description="Minta captain memberikan role pengurus agar bisa mengelola roster."
                    />
                </DashboardPanel>
            </DashboardPageShell>
        );
    }

    const candidates = await prisma.user.findMany({
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
    });

    return (
        <DashboardPageShell>
            <TeamManageClient team={team as TeamView} candidates={candidates} returnHref="/dashboard/team" />
        </DashboardPageShell>
    );
}
