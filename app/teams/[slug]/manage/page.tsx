import { notFound, redirect } from "next/navigation";
import { TeamManageClient } from "@/components/teams/team-manage-client";
import type { TeamView } from "@/components/teams/types";
import { Footer } from "@/components/ui/footer";
import { Navbar } from "@/components/ui/navbar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTeamService } from "@/lib/services/team.service";

const teamService = createTeamService();

export default async function ManageTeamPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    const team = await teamService.getTeamBySlug(slug, user.id);

    if (!team) {
        notFound();
    }

    if (!team.viewerMembership || !(team.permissions.canEditTeam || team.permissions.canInvite || team.permissions.canPromote)) {
        redirect(`/teams/${slug}`);
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
        <main className="min-h-screen bg-transparent text-base-content">
            <Navbar />
            <section className="border-b border-base-300 pt-28">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
                    <div>
                        <span className="badge badge-secondary badge-outline">Team Control Center</span>
                        <h1 className="mt-4 text-4xl font-black tracking-tight text-base-content">Kelola {team.name}</h1>
                        <p className="mt-4 max-w-3xl text-base text-base-content/75">
                            Atur info team, kirim invite, promosi role, dan transfer captain dari satu workspace DaisyUI yang konsisten.
                        </p>
                    </div>
                    <div className="card border border-base-300 bg-base-100/90 shadow-2xl">
                        <div className="card-body p-6">
                            <div className="mb-3 text-sm uppercase tracking-[0.28em] text-base-content/40">Ringkasan Akses</div>
                            <div className="text-2xl font-black text-base-content">{team.viewerMembership?.role ?? "Member"}</div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-base-content/70">
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">Members</div>
                                    <div>{team.memberCount} aktif</div>
                                </div>
                                <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-base-content/45">Invites</div>
                                    <div>{team.invites.length} pending</div>
                                </div>
                            </div>
                            <div className="mt-4 text-xs text-base-content/60">
                                Gunakan panel di bawah untuk mengelola roster dan informasi team.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <TeamManageClient team={team as TeamView} candidates={candidates} />
            </section>

            <Footer />
        </main>
    );
}
