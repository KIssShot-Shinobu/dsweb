import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ProfileAccountSection } from "@/components/dashboard/profile-account-section";
import { ProfileAvatarForm } from "@/components/dashboard/profile-avatar-form";
import { ProfileGameSection } from "@/components/dashboard/profile-game-section";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { activeTeamMembershipSelect, getActiveTeamSnapshot } from "@/lib/team-membership";
import type { GameProfile } from "@prisma/client";

export default async function ProfilePage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const [userWithProfiles, tournamentsJoined, reputation, recentAuditLogs] = await Promise.all([
        prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                username: true,
                gameProfiles: true,
                ...activeTeamMembershipSelect,
            },
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
    const activeTeam = userWithProfiles ? getActiveTeamSnapshot(userWithProfiles) : { team: null, teamJoinedAt: null };

    const roleColors: Record<string, string> = {
        USER: "border-base-300 bg-base-200 text-base-content/70",
        MEMBER: "border-info/20 bg-info/10 text-info",
        OFFICER: "border-secondary/20 bg-secondary/10 text-secondary",
        ADMIN: "border-warning/25 bg-warning/10 text-warning",
        FOUNDER: "border-error/20 bg-error/10 text-error",
    };

    const statusColors: Record<string, string> = {
        ACTIVE: "border-success/20 bg-success/10 text-success",
        BANNED: "border-error/20 bg-error/10 text-error",
    };

    const accountName = userWithProfiles?.username || user.username || user.fullName;
    const teamName = activeTeam.team?.name || (user.role === "USER" ? "Public User" : "Belum masuk team");
    const teamJoinedAt = activeTeam.teamJoinedAt
        ? new Date(activeTeam.teamJoinedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "-";
    const emailVerificationLabel = user.emailVerified ? "Terverifikasi" : "Belum Verifikasi";
    const emailVerificationClass = user.emailVerified
        ? "border-success/20 bg-success/10 text-success"
        : "border-warning/20 bg-warning/10 text-warning";
    const totalProfiles = userWithProfiles?.gameProfiles.length || 0;
    const verifiedProfiles = userWithProfiles?.gameProfiles.filter((profile) => Boolean(profile.screenshotUrl)).length || 0;
    const reputationPoints = reputation._sum.points || 0;

    const stats = [
        { label: "Turnamen", value: tournamentsJoined, color: "text-primary" },
        { label: "Profil Game", value: totalProfiles, color: "text-base-content" },
        { label: "Terverifikasi", value: verifiedProfiles, color: "text-success" },
        { label: "Reputasi", value: reputationPoints, color: "text-error" },
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
                        <div className="rounded-box border border-base-300 bg-base-200/40 p-6 shadow-sm">
                            <div className="flex items-center gap-4">
                                <ProfileAvatarForm username={accountName} fullName={user.fullName} initialAvatarUrl={user.avatarUrl} />
                                <div className="min-w-0">
                                    <h2 className="truncate text-xl font-black tracking-tight text-base-content">@{accountName}</h2>
                                    <p className="mt-1 truncate text-sm text-base-content/60">{user.email}</p>
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

                            <div className="mt-5 rounded-box border border-info/20 bg-info/10 px-4 py-3">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-info">Team Aktif</div>
                                <div className="mt-1 text-sm font-semibold text-base-content">{teamName}</div>
                                <div className="mt-1 text-xs text-base-content/60">Bergabung sejak {teamJoinedAt}</div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                {stats.map((stat) => (
                                    <div key={stat.label} className="rounded-box border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content/45">{stat.label}</div>
                                        <div className={`mt-2 text-xl font-black ${stat.color}`}>{stat.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-5 rounded-box border border-base-300 bg-base-200/40 p-5 shadow-sm">
                            <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
                                <ProfileAccountSection
                                    username={accountName}
                                    email={user.email}
                                    phoneWhatsapp={user.phoneWhatsapp || ""}
                                    provinceCode={user.provinceCode || ""}
                                    provinceName={user.provinceName || ""}
                                    cityCode={user.cityCode || ""}
                                    city={user.city || ""}
                                    emailVerified={user.emailVerified}
                                />

                                <div className="mt-4 border-t border-base-300 pt-4">
                                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">
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

                            <div className="space-y-3 border-t border-base-300 pt-4">
                                {accountMetaRows.map((row) => (
                                    <div key={row.label} className="flex flex-col gap-1 border-b border-base-300 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">{row.label}</span>
                                        <span className="text-sm font-medium text-base-content">{row.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-base-300 pt-4">
                                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">Aktivitas Terbaru</div>
                                {recentAuditLogs.length === 0 ? (
                                    <div className="rounded-box border border-dashed border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/60">
                                        Belum ada aktivitas tercatat.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {recentAuditLogs.map((log) => (
                                            <div
                                                key={`${log.action}-${log.createdAt.toISOString()}`}
                                                className="flex flex-col gap-1 rounded-box border border-base-300 bg-base-100 px-3 py-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-base-content/80">{log.action}</span>
                                                <span className="text-xs text-base-content/45">
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


