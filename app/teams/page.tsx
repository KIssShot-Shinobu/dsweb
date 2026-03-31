import type { Metadata } from "next";
import type { TeamView } from "@/components/teams/types";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { getCurrentUser } from "@/lib/auth";
import { createTeamService } from "@/lib/services/team.service";
import { TeamDirectoryClient } from "@/components/teams/team-directory-client";
import { prisma } from "@/lib/prisma";
import { getServerLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
    alternates: {
        canonical: "/teams",
    },
};


const teamService = createTeamService();

export default async function TeamsPage() {
    const locale = await getServerLocale();
    const t = getDictionary(locale);
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
                <div className="mx-auto max-w-[1400px] px-4 pb-14 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-black tracking-tight text-base-content sm:text-4xl md:text-5xl">
                        {t.teams.public.directory.title}
                    </h1>
                    <p className="mt-4 max-w-3xl text-sm text-base-content/75 sm:text-base">
                        {t.teams.public.directory.subtitle}
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
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
