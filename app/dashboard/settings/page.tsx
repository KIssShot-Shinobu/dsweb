"use client";

import { useEffect, useState } from "react";
import { btnDanger, btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { clientLogout } from "@/lib/client-auth";

type MeUser = {
    id: string;
    username: string;
    email: string;
    fullName: string;
    emailVerified: boolean;
};

export default function SettingsPage() {
    const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [me, setMe] = useState<MeUser | null>(null);
    const [meLoading, setMeLoading] = useState(true);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyMessage, setVerifyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
                if (data?.success && data.user) {
                    setMe({
                        id: data.user.id,
                        username: data.user.username ?? data.user.fullName,
                        email: data.user.email,
                        fullName: data.user.fullName,
                        emailVerified: Boolean(data.user.emailVerified),
                    });
                } else {
                    setMe(null);
                }
            })
            .catch(() => setMe(null))
            .finally(() => setMeLoading(false));
    }, []);

    const handleResendVerification = async () => {
        setVerifyLoading(true);
        setVerifyMessage(null);
        try {
            const response = await fetch("/api/auth/verify-email/resend", { method: "POST" });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                setVerifyMessage({ type: "error", text: data?.message || "Gagal kirim ulang verifikasi email." });
                return;
            }
            setVerifyMessage({ type: "success", text: data.message || "Link verifikasi berhasil dikirim ulang." });
        } catch {
            setVerifyMessage({ type: "error", text: "Terjadi gangguan jaringan." });
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleChangePassword = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch("/api/auth/password/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await response.json();

            if (!response.ok || !data?.success) {
                setError(data?.message || "Gagal mengubah password.");
                return;
            }

            setSuccessMessage(data.message || "Password berhasil diubah. Silakan login ulang.");
            setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setTimeout(() => {
                void clientLogout("/login");
            }, 1200);
        } catch {
            setError("Terjadi gangguan jaringan.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-5 lg:space-y-6">
                <DashboardPageHeader
                    kicker="Account Center"
                    title="Pengaturan"
                    description="Kelola verifikasi email dan keamanan akun dari satu halaman yang lebih minimal."
                />

                <DashboardPanel
                    title="Akun & Keamanan"
                    description="Status verifikasi email dan perubahan password digabung dalam satu panel agar tetap ringan dipakai."
                >
                    {verifyMessage ? (
                        <div
                            className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                                verifyMessage.type === "success"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                                    : "border-red-500/20 bg-red-500/10 text-red-500"
                            }`}
                        >
                            {verifyMessage.text}
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.92fr_1.08fr]">
                        <div className="rounded-[28px] border border-black/5 bg-slate-50/80 p-5 dark:border-white/6 dark:bg-white/[0.03]">
                            <div className="space-y-3">
                                <div className="border-b border-black/5 pb-3 dark:border-white/8">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">Username</div>
                                    <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                                        {meLoading ? "Memuat..." : me ? `@${me.username}` : "Tidak tersedia"}
                                    </div>
                                </div>

                                <div className="border-b border-black/5 pb-3 dark:border-white/8">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">Email</div>
                                    <div className="mt-2 text-sm font-medium text-slate-950 dark:text-white">
                                        {meLoading ? "Memuat..." : me?.email || "Tidak bisa memuat email"}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">Status Verifikasi</div>
                                    <div className="mt-2 flex flex-wrap items-center gap-3">
                                        <span
                                            className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                                                me?.emailVerified
                                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                                                    : "border-amber-500/30 bg-amber-500/10 text-amber-500"
                                            }`}
                                        >
                                            {meLoading ? "Memuat..." : me?.emailVerified ? "Terverifikasi" : "Belum Verifikasi"}
                                        </span>
                                        {!meLoading && me && !me.emailVerified ? (
                                            <button onClick={handleResendVerification} disabled={verifyLoading} className={btnOutline}>
                                                {verifyLoading ? "Mengirim..." : "Kirim Ulang Verifikasi"}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-black/5 bg-slate-50/80 p-5 dark:border-white/6 dark:bg-white/[0.03]">
                            <div className="mb-4">
                                <div className="text-sm font-semibold text-slate-950 dark:text-white">Ubah Password</div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-white/45">
                                    Setelah password diubah, sesi login saat ini akan ditutup dan Anda perlu masuk kembali.
                                </p>
                            </div>

                            {meLoading ? (
                                <p className="text-sm text-slate-500 dark:text-white/45">Memuat data akun...</p>
                            ) : !me ? (
                                <p className="text-sm text-red-500">Tidak bisa memuat data akun.</p>
                            ) : (
                                <>
                                    {error ? (
                                        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                                            {error}
                                        </div>
                                    ) : null}
                                    {successMessage ? (
                                        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
                                            {successMessage}
                                        </div>
                                    ) : null}

                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <div>
                                            <label className={labelCls}>Password Saat Ini</label>
                                            <input
                                                type="password"
                                                className={inputCls}
                                                placeholder="********"
                                                value={form.currentPassword}
                                                onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Password Baru</label>
                                            <input
                                                type="password"
                                                className={inputCls}
                                                placeholder="Min. 8 karakter"
                                                value={form.newPassword}
                                                onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Konfirmasi Password Baru</label>
                                            <input
                                                type="password"
                                                className={inputCls}
                                                placeholder="Ulangi password baru"
                                                value={form.confirmPassword}
                                                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <button type="submit" disabled={loading} className={btnPrimary}>
                                                {loading ? "Menyimpan..." : "Simpan Password"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    await clientLogout("/login");
                                                }}
                                                className={btnDanger}
                                            >
                                                Keluar dari Akun
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}


