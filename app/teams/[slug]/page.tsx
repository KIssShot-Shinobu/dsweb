import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamAvatar } from "@/components/teams/team-avatar";
import { TeamDetailActions } from "@/components/teams/team-detail-actions";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTeamService } from "@/lib/services/team.service";
import { getServerLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

const teamService = createTeamService();

const ROLE_BADGES: Record<string, string> = {
    CAPTAIN: "badge-primary",
    VICE_CAPTAIN: "badge-secondary",
    COACH: "badge-accent",
    MANAGER: "badge-warning",
    PLAYER: "badge-neutral",
};

function getRoleBadgeClass(role: string) {
    return ROLE_BADGES[role] ?? "badge-ghost";
}


export async function generateMetadata({ params }: { params: { slug: string } }) {
    return {
        alternates: {
            canonical: `/teams/${encodeURIComponent(params.slug)}`,
        },
    };
}

function RoleBlock({
    title,
    members,
    description,
    emptyLabel,
}: {
    title: string;
    description?: string;
    emptyLabel: string;
    members: Array<{
        id: string;
        role: string;
        joinedAt: string;
        userId: string;
        user: {
            id: string;
            username: string;
            fullName: string;
            email: string;
            avatarUrl: string | null;
            role: string;
            status: string;
        };
    }>;
}) {
    return (
        <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="card-title">{title}</h2>
                        {description ? <p className="text-sm text-base-content/70">{description}</p> : null}
                    </div>
                    <span className="badge badge-outline">{members.length}</span>
                </div>
                {members.length === 0 ? (
                    <div className="alert alert-info mt-4">{emptyLabel}</div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3">
                                <TeamAvatar name={member.user.fullName} avatarUrl={member.user.avatarUrl} />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-semibold">{member.user.fullName}</div>
                                    <div className="truncate text-sm text-base-content/70">
                                        @{member.user.username} - {member.user.email}
                                    </div>
                                </div>
                                <span className={`badge ${getRoleBadgeClass(member.role)}`}>{member.role}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default async function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const locale = await getServerLocale();
    const t = getDictionary(locale);
    const { slug } = await params;
    const user = await getCurrentUser();

    const [team, pendingInvite, activeMembership] = await Promise.all([
        teamService.getTeamBySlug(slug, user?.id ?? null),
        user
            ? prisma.teamInvite.findFirst({
                  where: {
                      userId: user.id,
                      status: "PENDING",
                      team: { slug },
                  },
                  select: { id: true },
              })
            : Promise.resolve(null),
        user
            ? prisma.teamMember.findFirst({
                  where: { userId: user.id, leftAt: null },
                  select: { teamId: true },
              })
            : Promise.resolve(null),
    ]);

    if (!team) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto max-w-[1400px] px-4 pb-14 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start gap-4">
                            <TeamAvatar name={team.name} avatarUrl={team.logoUrl} size="lg" />
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-3xl font-black tracking-tight text-base-content">{team.name}</h1>
                                    <span className={`badge ${team.isActive ? "badge-success" : "badge-ghost"}`}>
                                        {team.isActive ? t.teams.public.detail.statusActive : t.teams.public.detail.statusInactive}
                                    </span>
                                    {team.viewerMembership ? <span className="badge badge-primary badge-outline">{t.teams.public.detail.memberBadge}</span> : null}
                                    {pendingInvite ? <span className="badge badge-secondary badge-outline">{t.teams.public.detail.inviteBadge}</span> : null}
                                    {team.viewerHasPendingJoin ? (
                                        <span className="badge badge-warning badge-outline">{t.teams.public.detail.pendingBadge}</span>
                                    ) : null}
                                </div>
                                <p className="max-w-3xl text-base text-base-content/75">
                                    {team.description || t.teams.public.detail.descriptionEmpty}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="badge badge-outline">{t.teams.public.detail.memberCount(team.memberCount)}</span>
                                    {team.captain ? (
                                        <span className="badge badge-outline">{t.teams.public.detail.captainLabel(team.captain.user.fullName)}</span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                        <TeamDetailActions
                            teamId={team.id}
                            pendingInviteId={pendingInvite?.id ?? null}
                            hasActiveTeam={Boolean(activeMembership)}
                            isMember={Boolean(team.viewerMembership)}
                            hasPendingJoin={team.viewerHasPendingJoin}
                        />
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-6">
                        <RoleBlock
                            title={t.teams.public.detail.roles.captain}
                            description={t.teams.public.detail.roleDescriptions.captain}
                            emptyLabel={t.teams.public.detail.roleEmpty}
                            members={team.captain ? [team.captain] : []}
                        />
                        <RoleBlock
                            title={t.teams.public.detail.roles.viceCaptains}
                            description={t.teams.public.detail.roleDescriptions.viceCaptains}
                            emptyLabel={t.teams.public.detail.roleEmpty}
                            members={team.viceCaptains}
                        />
                        <RoleBlock
                            title={t.teams.public.detail.roles.players}
                            description={t.teams.public.detail.roleDescriptions.players}
                            emptyLabel={t.teams.public.detail.roleEmpty}
                            members={team.players}
                        />
                    </div>
                    <div className="space-y-6">
                        <RoleBlock
                            title={t.teams.public.detail.roles.managers}
                            description={t.teams.public.detail.roleDescriptions.managers}
                            emptyLabel={t.teams.public.detail.roleEmpty}
                            members={team.managers}
                        />
                        <RoleBlock
                            title={t.teams.public.detail.roles.coaches}
                            description={t.teams.public.detail.roleDescriptions.coaches}
                            emptyLabel={t.teams.public.detail.roleEmpty}
                            members={team.coaches}
                        />
                        <section className="card border border-base-300 bg-base-100 shadow-sm">
                            <div className="card-body">
                                <h2 className="card-title">{t.teams.public.detail.infoTitle}</h2>
                                <p className="text-sm text-base-content/70">{t.teams.public.detail.infoBody}</p>
                                <Link href="/teams" className="btn btn-outline justify-start">
                                    {t.teams.public.detail.infoAction}
                                </Link>
                            </div>
                        </section>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
