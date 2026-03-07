import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { GameProfileForm } from "@/components/dashboard/game-profile-form";
import { DashboardMetricCard, DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import type { GameProfile } from "@prisma/client";

export default async function ProfilePage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const [userWithProfiles, tournamentsJoined, reputation, recentAuditLogs] = await Promise.all([
        prisma.user.findUnique({
            where: { id: user.id },
            include: { gameProfiles: true },
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

    const dlProfile = userWithProfiles?.gameProfiles.find((p: GameProfile) => p.gameType === "DUEL_LINKS");
    const mdProfile = userWithProfiles?.gameProfiles.find((p: GameProfile) => p.gameType === "MASTER_DUEL");

    const roleColors: Record<string, string> = {
        USER: "bg-slate-500/10 text-slate-500 border-slate-500/20",
        MEMBER: "bg-blue-500/10 text-blue-400 border-blue-400/20",
        OFFICER: "bg-purple-500/10 text-purple-400 border-purple-400/20",
        ADMIN: "bg-ds-amber/10 text-ds-amber border-ds-amber/30",
        FOUNDER: "bg-red-500/10 text-red-400 border-red-400/20",
    };

    const statusColors: Record<string, string> = {
        ACTIVE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        BANNED: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    const getInitials = (name: string) =>
        name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

    const formatDate = (d: Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const formatDateTime = (d: Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const emailVerificationLabel = user.emailVerified ? "Terverifikasi" : "Belum Verifikasi";
    const emailVerificationClass = user.emailVerified
        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
        : "bg-amber-500/10 text-amber-500 border-amber-500/20";
    const verifiedProfiles = userWithProfiles?.gameProfiles.filter((profile) => Boolean(profile.screenshotUrl)).length || 0;
    const totalProfiles = userWithProfiles?.gameProfiles.length || 0;
    const reputationPoints = reputation._sum.points || 0;

    return (
        <DashboardPageShell>
            <div className="space-y-5 lg:space-y-6">
                <DashboardPageHeader
                    kicker="Player Profile"
                    title="Profil Saya"
                    description="Ringkasan akun, identitas guild, statistik partisipasi, dan game profile Anda dalam satu halaman yang lebih rapi."
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DashboardMetricCard label="Turnamen Diikuti" value={tournamentsJoined} meta="Total partisipasi tournament" tone="accent" />
                    <DashboardMetricCard label="Profil Game" value={totalProfiles} meta="Duel Links + Master Duel" />
                    <DashboardMetricCard label="Terverifikasi" value={verifiedProfiles} meta="Profile dengan screenshot tersimpan" tone="success" />
                    <DashboardMetricCard label="Reputasi" value={reputationPoints} meta="Akumulasi poin reputasi" tone="danger" />
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                    <DashboardPanel title="Kartu Akun" description="Identitas dasar, role, status, dan kondisi verifikasi email akun Anda.">
                        <div className="flex flex-col items-center rounded-[28px] border border-black/5 bg-slate-50/80 px-6 py-8 text-center dark:border-white/6 dark:bg-white/[0.03]">
                            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-ds-amber text-3xl font-black text-black">
                                {getInitials(user.fullName)}
                            </div>
                            <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950 dark:text-white">{user.fullName}</h2>
                            <p className="mt-1 text-sm text-slate-400 dark:text-white/40">{user.email}</p>
                            <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${emailVerificationClass}`}>
                                Email: {emailVerificationLabel}
                            </span>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${roleColors[user.role] || roleColors.USER}`}>{user.role}</span>
                                <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${statusColors[user.status] || ""}`}>{user.status}</span>
                            </div>
                        </div>
                    </DashboardPanel>

                    <DashboardPanel title="Informasi Akun" description="Data akun utama, kontak, dan histori singkat aktivitas Anda.">
                        <div className="space-y-3 rounded-[28px] border border-black/5 bg-slate-50/80 p-5 dark:border-white/6 dark:bg-white/[0.03]">
                            {[
                                { label: "Nama Lengkap", value: user.fullName },
                                { label: "Email", value: user.email },
                                { label: "Verifikasi Email", value: emailVerificationLabel },
                                { label: "WhatsApp", value: user.phoneWhatsapp || "-" },
                                { label: "Kota", value: user.city || "-" },
                                { label: "Terakhir Aktif", value: formatDateTime(user.lastActiveAt) },
                                { label: "Terdaftar Sejak", value: formatDate(user.createdAt) },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex flex-col gap-1 border-b border-black/5 py-2 last:border-0 dark:border-white/8 sm:flex-row sm:items-center sm:justify-between">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">{label}</span>
                                    <span className="text-sm font-medium text-slate-950 dark:text-white">{value}</span>
                                </div>
                            ))}
                        </div>
                    </DashboardPanel>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <GameProfileForm gameType="DUEL_LINKS" initialData={dlProfile ? { gameType: "DUEL_LINKS", ign: dlProfile.ign, gameId: dlProfile.gameId } : undefined} />
                    <GameProfileForm gameType="MASTER_DUEL" initialData={mdProfile ? { gameType: "MASTER_DUEL", ign: mdProfile.ign, gameId: mdProfile.gameId } : undefined} />
                </div>

                <DashboardPanel title="Aktivitas Terbaru" description="Tiga aktivitas audit terakhir yang tercatat atas akun Anda.">
                    {recentAuditLogs.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-black/5 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-500 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/45">
                            Belum ada aktivitas tercatat.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentAuditLogs.map((log) => (
                                <div key={`${log.action}-${log.createdAt.toISOString()}`} className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-slate-50/80 p-4 dark:border-white/6 dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between">
                                    <span className="text-sm font-semibold text-slate-950 dark:text-white">{log.action}</span>
                                    <span className="text-xs text-slate-400 dark:text-white/40">{formatDateTime(log.createdAt)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}
