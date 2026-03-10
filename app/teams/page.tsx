import type { TeamView } from "@/components/teams/types";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTeamService } from "@/lib/services/team.service";
import { TeamDirectoryClient } from "@/components/teams/team-directory-client";

const teamService = createTeamService();

export default async function TeamsPage() {
    const user = await getCurrentUser();

    const [teams, pendingInvites, activeMembership] = await Promise.all([
        teamService.listTeams(user?.id ?? null),
        user
            ? prisma.teamInvite.findMany({
                  where: { userId: user.id, status: "PENDING" },
                  select: {
                      id: true,
                      createdAt: true,
                      team: {
                          select: {
                              id: true,
                              name: true,
                              slug: true,
                              logoUrl: true,
                          },
                      },
                      invitedBy: {
                          select: {
                              fullName: true,
                          },
                      },
                  },
                  orderBy: { createdAt: "desc" },
              })
            : Promise.resolve([]),
        user
            ? prisma.teamMember.findFirst({
                  where: { userId: user.id, leftAt: null },
                  select: {
                      team: {
                          select: {
                              slug: true,
                          },
                      },
                  },
              })
            : Promise.resolve(null),
    ]);

    const totalTeams = teams.length;
    const activeTeams = teams.filter((team) => team.isActive).length;
    const totalMembers = teams.reduce((sum, team) => sum + team.memberCount, 0);
    const pendingInviteCount = pendingInvites.length;

    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
                    <div>
                        <span className="badge badge-secondary badge-outline">Team Management System</span>
                        <h1 className="mt-4 text-4xl font-black tracking-tight text-base-content md:text-5xl">
                            Bangun team esports yang dikelola pemain, bukan admin.
                        </h1>
                        <p className="mt-4 max-w-3xl text-base text-base-content/75">
                            Captain, vice captain, coach, dan manager sekarang bisa mengelola roster sendiri dengan alur invite,
                            promosi role, dan pengelolaan profil team yang konsisten.
                        </p>
                    </div>
                    <div className="card border border-base-300 bg-base-100/90 shadow-2xl">
                        <div className="card-body p-6">
                            <div className="mb-4 text-sm uppercase tracking-[0.28em] text-base-content/40">Ringkasan Direktori</div>
                            <div className="mb-2 text-6xl font-black text-primary">{String(totalTeams).padStart(2, "0")}</div>
                            <div className="text-lg font-semibold text-base-content">Team aktif siap rekrut roster.</div>
                            <div className="stats stats-vertical mt-4 w-full border border-base-300 bg-base-200/60 shadow-sm sm:stats-horizontal">
                                <div className="stat">
                                    <div className="stat-title">Aktif</div>
                                    <div className="stat-value text-base-content">{activeTeams}</div>
                                    <div className="stat-desc">Team</div>
                                </div>
                                <div className="stat">
                                    <div className="stat-title">Roster</div>
                                    <div className="stat-value text-base-content">{totalMembers}</div>
                                    <div className="stat-desc">Member</div>
                                </div>
                                <div className="stat">
                                    <div className="stat-title">Invite</div>
                                    <div className="stat-value text-base-content">{pendingInviteCount}</div>
                                    <div className="stat-desc">Pending</div>
                                </div>
                                <div className="stat">
                                    <div className="stat-title">Mode</div>
                                    <div className="stat-value text-base-content">{activeMembership ? "Managed" : "Browse"}</div>
                                    <div className="stat-desc">Status akun</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <TeamDirectoryClient
                    teams={teams as TeamView[]}
                    pendingInvites={pendingInvites as never}
                    isLoggedIn={Boolean(user)}
                    activeTeamSlug={activeMembership?.team.slug ?? null}
                />
            </section>

            <Footer />
        </main>
    );
}
