import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ProfileAccountSection } from "@/components/dashboard/profile-account-section";
import { ProfileAvatarForm } from "@/components/dashboard/profile-avatar-form";
import { ProfileGameSection } from "@/components/dashboard/profile-game-section";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import type { GameProfile } from "@prisma/client";

export default async function ProfilePage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const [userWithProfiles, tournamentsJoined, reputation, recentAuditLogs] = await Promise.all([
        prisma.user.findUnique({
            where: { id: user.id },
            include: { gameProfiles: true, team: true },
        }),
        prisma.tournamentParticipant.count({ where: { userId: user.id } }),
        prisma.reputationLog.aggregate({ where: { userId: user.id }, _sum: { points: true } }),
        prisma.auditLog.findMany({
            where: { userId: user.id },
            select: { action: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 3,
        }),
    ]);

    const duelLinksProfile = userWithProfiles?.gameProfiles.find((profile: GameProfile) => profile.gameType === "DUEL_LINKS");
    const masterDuelProfile = userWithProfiles?.gameProfiles.find((profile: GameProfile) => profile.gameType === "MASTER_DUEL");

    const roleColors: Record<string, string> = {
        USER: "border-slate-500/20 bg-slate-500/10 text-slate-500",
        MEMBER: "border-blue-400/20 bg-blue-500/10 text-blue-400",
        OFFICER: "border-purple-400/20 bg-purple-500/10 text-purple-400",
        ADMIN: "border-ds-amber/30 bg-ds-amber/10 text-ds-amber",
        FOUNDER: "border-red-500/20 bg-red-500/10 text-red-400",
    };

    const statusColors: Record<string, string> = {
        ACTIVE: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
        BANNED: "border-red-500/20 bg-red-500/10 text-red-500",
    };

    const accountName = userWithProfiles?.username || user.username || user.fullName;
    const teamName = userWithProfiles?.team?.name || (user.role === "USER" ? "Public User" : "Belum masuk team");
    const teamJoinedAt = userWithProfiles?.teamJoinedAt
        ? new Date(userWithProfiles.teamJoinedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "-";
    const emailVerificationLabel = user.emailVerified ? "Terverifikasi" : "Belum Verifikasi";
    const emailVerificationClass = user.emailVerified
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
        : "border-amber-500/20 bg-amber-500/10 text-amber-500";
    const totalProfiles = userWithProfiles?.gameProfiles.length || 0;
    const verifiedProfiles = userWithProfiles?.gameProfiles.filter((profile) => Boolean(profile.screenshotUrl)).length || 0;
    const reputationPoints = reputation._sum.points || 0;

    const stats = [
        { label: "Turnamen", value: tournamentsJoined, color: "text-ds-amber" },
        { label: "Profil Game", value: totalProfiles, color: "text-slate-950 dark:text-white" },
        { label: "Terverifikasi", value: verifiedProfiles, color: "text-emerald-500" },
        { label: "Reputasi", value: reputationPoints, color: "text-red-400" },
    ];

    const accountMetaRows = [
        {
            label: "Terakhir Aktif",
            value: new Date(user.lastActiveAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
        },
        {
            label: "Terdaftar",
            value: new Date(user.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
            }),
        },
    ];

    return (
        <DashboardPageShell>
            <div className="space-y-5 lg:space-y-6">
                <DashboardPageHeader
                    kicker="Player Profile"
                    title="Profil Saya"
                    description="Identitas akun, role komunitas, team aktif, dan profile game Anda dalam tampilan yang lebih ringkas."
                />

                <DashboardPanel
                    title="Ringkasan Akun"
                    description="Informasi utama akun, profile game, dan jejak aktivitas singkat disusun berurutan agar lebih mudah dipindai."
                >
                    <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
                        <div className="rounded-[28px] border border-black/5 bg-slate-50/80 p-6 dark:border-white/6 dark:bg-white/[0.03]">
                            <div className="flex items-center gap-4">
                                <ProfileAvatarForm username={accountName} fullName={user.fullName} initialAvatarUrl={user.avatarUrl} />
                                <div className="min-w-0">
                                    <h2 className="truncate text-xl font-black tracking-tight text-slate-950 dark:text-white">@{accountName}</h2>
                                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-white/45">{user.email}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${roleColors[user.role] || roleColors.USER}`}>
                                            {user.role}
                                        </span>
                                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${statusColors[user.status] || statusColors.ACTIVE}`}>
                                            {user.status}
                                        </span>
                                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${emailVerificationClass}`}>
                                            {emailVerificationLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-sky-500/15 bg-sky-500/8 px-4 py-3">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-500/80">Team Aktif</div>
                                <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{teamName}</div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-white/45">Bergabung sejak {teamJoinedAt}</div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                {stats.map((stat) => (
                                    <div key={stat.label} className="rounded-2xl border border-black/5 bg-white/70 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-white/35">{stat.label}</div>
                                        <div className={`mt-2 text-xl font-black ${stat.color}`}>{stat.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-5 rounded-[28px] border border-black/5 bg-slate-50/80 p-5 dark:border-white/6 dark:bg-white/[0.03]">
                            <div className="rounded-[24px] border border-black/5 bg-white/65 p-4 dark:border-white/8 dark:bg-white/[0.025]">
                                <ProfileAccountSection
                                    username={accountName}
                                    email={user.email}
                                    phoneWhatsapp={user.phoneWhatsapp || ""}
                                    city={user.city || ""}
                                    emailVerified={user.emailVerified}
                                />

                                <div className="mt-4 border-t border-black/5 pt-4 dark:border-white/8">
                                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">
                                        Profile Game
                                    </div>
                                    <ProfileGameSection
                                        duelLinksProfile={
                                            duelLinksProfile
                                                ? { gameType: "DUEL_LINKS", ign: duelLinksProfile.ign, gameId: duelLinksProfile.gameId }
                                                : undefined
                                        }
                                        masterDuelProfile={
                                            masterDuelProfile
                                                ? { gameType: "MASTER_DUEL", ign: masterDuelProfile.ign, gameId: masterDuelProfile.gameId }
                                                : undefined
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 border-t border-black/5 pt-4 dark:border-white/8">
                                {accountMetaRows.map((row) => (
                                    <div key={row.label} className="flex flex-col gap-1 border-b border-black/5 pb-3 last:border-0 last:pb-0 dark:border-white/8 sm:flex-row sm:items-center sm:justify-between">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">{row.label}</span>
                                        <span className="text-sm font-medium text-slate-950 dark:text-white">{row.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-black/5 pt-4 dark:border-white/8">
                                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">Aktivitas Terbaru</div>
                                {recentAuditLogs.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-black/5 bg-white/70 px-4 py-3 text-sm text-slate-500 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/45">
                                        Belum ada aktivitas tercatat.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {recentAuditLogs.map((log) => (
                                            <div
                                                key={`${log.action}-${log.createdAt.toISOString()}`}
                                                className="flex flex-col gap-1 rounded-xl border border-black/5 bg-white/70 px-3 py-2.5 dark:border-white/8 dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-white/78">{log.action}</span>
                                                <span className="text-xs text-slate-400 dark:text-white/40">
                                                    {new Date(log.createdAt).toLocaleDateString("id-ID", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
