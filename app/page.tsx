import { Navbar } from "@/components/ui/navbar";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Socials } from "@/components/sections/socials";
import { Tournaments } from "@/components/sections/tournaments";
import { Footer } from "@/components/ui/footer";
import { prisma } from "@/lib/prisma";
import type { PublicTournamentCardData } from "@/components/public/tournament-card";
import { resolveTournamentImage } from "@/lib/tournament-image";
import { MemberDistributionMap } from "@/components/maps/member-distribution-map";
import { getServerLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function Home() {
  const locale = await getServerLocale();
  const t = getDictionary(locale);
  let activeUserCount = 0;
  let tournamentCount = 0;
  let tournaments: PublicTournamentCardData[] = [];

  try {
    const [activeUsers, totalTournaments, dbTournaments] = await Promise.all([
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.tournament.count(),
      prisma.tournament.findMany({
        select: {
          id: true,
          title: true,
          game: { select: { code: true, name: true } },
          startAt: true,
          prizePool: true,
          status: true,
          image: true,
          description: true,
          maxPlayers: true,
          _count: {
            select: { participants: true },
          },
        },
        orderBy: { startAt: "asc" },
        take: 12,
      }),
    ]);

    activeUserCount = activeUsers;
    tournamentCount = totalTournaments;

    const order: Record<string, number> = {
      ONGOING: 0,
      OPEN: 1,
      COMPLETED: 2,
      CANCELLED: 3,
    };

    tournaments = dbTournaments
      .map((t) => ({
        id: t.id,
        title: t.title,
        gameType: t.game?.code ?? "",
        gameName: t.game?.name ?? "",
        startAt: t.startAt.toISOString(),
        prizePool: t.prizePool,
        status: t.status,
        image: resolveTournamentImage(t.image),
        description: t.description,
        participantCount: t._count.participants,
        maxPlayers: t.maxPlayers,
      }))
      .sort((a, b) => {
        const byStatus = (order[a.status] ?? 9) - (order[b.status] ?? 9);
        if (byStatus !== 0) return byStatus;
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      })
      .slice(0, 6);
  } catch (error) {
    console.error("[Public Home] Failed to load DB data:", error);
  }

  return (
    <main className="min-h-screen bg-transparent">
      <Navbar />
      <Hero />
      <About activeUserCount={activeUserCount} tournamentCount={tournamentCount} />
      <Tournaments tournaments={tournaments} />
      <section className="border-y border-base-300 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center sm:mb-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-primary sm:text-sm">{t.home.distributionBadge}</p>
            <h2 className="mb-3 text-2xl font-black text-base-content sm:text-4xl">{t.home.distributionTitle}</h2>
            <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">{t.home.distributionSubtitle}</p>
          </div>
          <div className="card border border-base-300 bg-base-100/80 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <div className="h-[500px] w-full overflow-hidden rounded-box border border-base-300 bg-base-200/40">
                <MemberDistributionMap />
              </div>
            </div>
          </div>
        </div>
      </section>
      <Socials />
      <Footer />
    </main>
  );
}
