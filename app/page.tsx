import { Navbar } from "@/components/ui/navbar";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Socials } from "@/components/sections/socials";
import { Tournaments } from "@/components/sections/tournaments";
import { Footer } from "@/components/ui/footer";
import { prisma } from "@/lib/prisma";
import type { PublicTournamentCardData } from "@/components/public/tournament-card";

export default async function Home() {
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
          gameType: true,
          startDate: true,
          prizePool: true,
          status: true,
          image: true,
          description: true,
          _count: {
            select: { participants: true },
          },
        },
        orderBy: { startDate: "asc" },
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
        gameType: t.gameType,
        startDate: t.startDate.toISOString(),
        prizePool: t.prizePool,
        status: t.status,
        image: t.image,
        description: t.description,
        participantCount: t._count.participants,
      }))
      .sort((a, b) => {
        const byStatus = (order[a.status] ?? 9) - (order[b.status] ?? 9);
        if (byStatus !== 0) return byStatus;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
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
      <Socials />
      <Footer />
    </main>
  );
}
