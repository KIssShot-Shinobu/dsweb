import type { TeamView } from "@/components/teams/types";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { getCurrentUser } from "@/lib/auth";
import { createTeamService } from "@/lib/services/team.service";
import { TeamDirectoryClient } from "@/components/teams/team-directory-client";

const teamService = createTeamService();

export default async function TeamsPage() {
    const user = await getCurrentUser();

    const [teams, activeMembership] = await Promise.all([
        teamService.listTeams(user?.id ?? null),
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

    return (
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
                    <span className="badge badge-secondary badge-outline">Direktori Team</span>
                    <h1 className="mt-4 text-4xl font-black tracking-tight text-base-content md:text-5xl">
                        Cari team aktif dan ajukan bergabung.
                    </h1>
                    <p className="mt-4 max-w-3xl text-base text-base-content/75">
                        Semua pengelolaan roster dilakukan di dashboard. Di sini fokus untuk melihat profil team dan mengajukan
                        request join.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <TeamDirectoryClient
                    teams={teams as TeamView[]}
                    isLoggedIn={Boolean(user)}
                    activeTeamSlug={activeMembership?.team.slug ?? null}
                />
            </section>

            <Footer />
        </main>
    );
}
