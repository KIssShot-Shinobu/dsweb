import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { GameProfileForm } from "@/components/dashboard/game-profile-form";

// Server component that reads user from cookie and renders profile
export default async function ProfilePage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const userWithProfiles = await prisma.user.findUnique({
        where: { id: user.id },
        include: { gameProfiles: true }
    });

    const dlProfile = userWithProfiles?.gameProfiles.find((p: any) => p.gameType === "DUEL_LINKS");
    const mdProfile = userWithProfiles?.gameProfiles.find((p: any) => p.gameType === "MASTER_DUEL");

    const roleColors: Record<string, string> = {
        USER: "bg-gray-500/10 text-gray-400 border-gray-400/20",
        MEMBER: "bg-blue-500/10 text-blue-400 border-blue-400/20",
        OFFICER: "bg-purple-500/10 text-purple-400 border-purple-400/20",
        ADMIN: "bg-ds-amber/10 text-ds-amber border-ds-amber/30",
        FOUNDER: "bg-red-500/10 text-red-400 border-red-400/20",
    };

    const statusColors: Record<string, string> = {
        ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
        BANNED: "bg-red-900/20 text-red-500 border-red-900/20",
    };

    const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const formatDate = (d: Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    return (
        <>
            <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Profil Saya</h1>
                <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Informasi akun dan keanggotaan</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 p-6 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-ds-amber flex items-center justify-center text-black text-2xl font-bold mx-auto mb-4">
                            {getInitials(user.fullName)}
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{user.fullName}</h2>
                        <p className="text-sm text-gray-400 dark:text-white/40 mb-4">{user.email}</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${roleColors[user.role] || roleColors.USER}`}>
                                {user.role}
                            </span>
                            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${statusColors[user.status] || ""}`}>
                                {user.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 p-5">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Informasi Akun</h3>
                        <div className="space-y-3">
                            {[
                                { label: "Nama Lengkap", value: user.fullName },
                                { label: "Email", value: user.email },
                                { label: "WhatsApp", value: user.phoneWhatsapp || "-" },
                                { label: "Kota", value: user.city || "-" },
                                { label: "Terdaftar Sejak", value: formatDate(user.createdAt) },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/[0.04] last:border-0">
                                    <span className="text-xs font-medium text-gray-400 dark:text-white/40 uppercase tracking-wider">{label}</span>
                                    <span className="text-sm text-gray-900 dark:text-white font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {user.status === "PENDING" && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">⏳</span>
                                <div>
                                    <h3 className="text-sm font-bold text-yellow-400 mb-1">Akun Dalam Review</h3>
                                    <p className="text-xs text-yellow-400/70 leading-relaxed">
                                        Pendaftaran Anda sedang ditinjau oleh admin. Proses ini biasanya membutuhkan 1-3 hari kerja. Anda akan dihubungi melalui WhatsApp ketika akun disetujui.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Game Profiles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <GameProfileForm
                            gameType="DUEL_LINKS"
                            initialData={dlProfile ? { gameType: "DUEL_LINKS", ign: dlProfile.ign, gameId: dlProfile.gameId } : undefined}
                        />
                        <GameProfileForm
                            gameType="MASTER_DUEL"
                            initialData={mdProfile ? { gameType: "MASTER_DUEL", ign: mdProfile.ign, gameId: mdProfile.gameId } : undefined}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
