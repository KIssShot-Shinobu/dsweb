"use client";

import { useEffect, useState } from "react";
import { btnDanger, btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import {
    DashboardMetricCard,
    DashboardPageHeader,
    DashboardPageShell,
    DashboardPanel,
} from "@/components/dashboard/page-shell";

type MeUser = {
    id: string;
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
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.success && data.user) {
                    setMe({
                        id: data.user.id,
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
            const res = await fetch("/api/auth/verify-email/resend", { method: "POST" });
            const data = await res.json();
            if (!res.ok || !data?.success) {
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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const res = await fetch("/api/auth/password/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (!res.ok || !data?.success) {
                setError(data?.message || "Gagal mengubah password.");
                return;
            }

            setSuccessMessage(data.message || "Password berhasil diubah. Silakan login ulang.");
            setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setTimeout(() => {
                window.location.href = "/login";
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
                    description="Kelola keamanan akun, status verifikasi email, dan sesi aktif dari satu halaman yang lebih rapi."
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <DashboardMetricCard label="Akun" value={meLoading ? "..." : me?.fullName || "Tidak tersedia"} meta="Identitas akun aktif" tone="accent" />
                    <DashboardMetricCard label="Email Status" value={meLoading ? "..." : me?.emailVerified ? "Verified" : "Pending"} meta={me?.email || "Email belum termuat"} tone={me?.emailVerified ? "success" : "default"} />
                    <DashboardMetricCard label="Security" value="Password" meta="Perubahan password akan memutus sesi login saat ini" tone="danger" />
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                    <DashboardPanel title="Verifikasi Email" description="Cek status email aktif dan kirim ulang link verifikasi jika diperlukan.">
                        {verifyMessage ? (
                            <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${verifyMessage.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" : "border-red-500/20 bg-red-500/10 text-red-500"}`}>
                                {verifyMessage.text}
                            </div>
                        ) : null}

                        {meLoading ? (
                            <p className="text-sm text-slate-500 dark:text-white/45">Memuat status verifikasi...</p>
                        ) : !me ? (
                            <p className="text-sm text-red-500">Tidak bisa memuat data akun.</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-black/5 bg-slate-50/80 px-4 py-4 dark:border-white/6 dark:bg-white/[0.03]">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">Email</p>
                                            <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{me.email}</p>
                                        </div>
                                        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${me.emailVerified ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-amber-500/30 bg-amber-500/10 text-amber-500"}`}>
                                            {me.emailVerified ? "Terverifikasi" : "Belum Verifikasi"}
                                        </span>
                                    </div>
                                </div>
                                {!me.emailVerified ? (
                                    <button onClick={handleResendVerification} disabled={verifyLoading} className={btnOutline}>
                                        {verifyLoading ? "Mengirim..." : "Kirim Ulang Verifikasi Email"}
                                    </button>
                                ) : null}
                            </div>
                        )}
                    </DashboardPanel>

                    <DashboardPanel title="Keamanan Akun" description="Ubah password dan putuskan sesi untuk menjaga akses tetap aman.">
                        {error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div> : null}
                        {successMessage ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">{successMessage}</div> : null}
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className={labelCls}>Password Saat Ini</label>
                                <input type="password" className={inputCls} placeholder="********" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
                            </div>
                            <div>
                                <label className={labelCls}>Password Baru</label>
                                <input type="password" className={inputCls} placeholder="Min. 8 karakter" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
                            </div>
                            <div>
                                <label className={labelCls}>Konfirmasi Password Baru</label>
                                <input type="password" className={inputCls} placeholder="Ulangi password baru" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button type="submit" disabled={loading} className={btnPrimary}>
                                    {loading ? "Menyimpan..." : "Simpan Password"}
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await fetch("/api/auth/logout", { method: "POST" });
                                        window.location.href = "/login";
                                    }}
                                    className={btnDanger}
                                >
                                    Keluar dari Akun
                                </button>
                            </div>
                        </form>
                    </DashboardPanel>
                </div>
            </div>
        </DashboardPageShell>
    );
}
