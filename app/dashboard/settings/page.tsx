"use client";

import { useEffect, useState } from "react";

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

    const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 transition-all";
    const labelCls = "block text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-1.5";

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
        <>
            <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Pengaturan</h1>
                <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Kelola preferensi akun Anda</p>
            </div>

            <div className="max-w-lg space-y-4">
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 p-5">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Verifikasi Email</h3>
                    {verifyMessage && (
                        <div
                            className={`mb-3 px-4 py-3 rounded-xl border text-sm ${verifyMessage.type === "success"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                                }`}
                        >
                            {verifyMessage.text}
                        </div>
                    )}
                    {meLoading ? (
                        <p className="text-sm text-gray-500 dark:text-white/50">Memuat status verifikasi...</p>
                    ) : !me ? (
                        <p className="text-sm text-red-500">Tidak bisa memuat data akun.</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] px-4 py-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-white/40">Email</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{me.email}</p>
                                </div>
                                <span
                                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${me.emailVerified
                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                        : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                        }`}
                                >
                                    {me.emailVerified ? "Terverifikasi" : "Belum Verifikasi"}
                                </span>
                            </div>
                            {!me.emailVerified && (
                                <button
                                    onClick={handleResendVerification}
                                    disabled={verifyLoading}
                                    className="w-full py-2.5 rounded-xl border border-ds-amber/40 text-ds-amber hover:bg-ds-amber/10 text-sm font-semibold transition-all disabled:opacity-50"
                                >
                                    {verifyLoading ? "Mengirim..." : "Kirim Ulang Verifikasi Email"}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 p-5">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Ubah Password</h3>
                    {error && <div className="mb-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}
                    {successMessage && <div className="mb-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">{successMessage}</div>}
                    <form onSubmit={handleChangePassword} className="space-y-3">
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
                        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-ds-amber hover:bg-ds-gold text-black font-semibold text-sm transition-all disabled:opacity-50">
                            {loading ? "Menyimpan..." : "Simpan Password"}
                        </button>
                    </form>
                </div>

                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 p-5">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Sesi & Logout</h3>
                    <button
                        onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
                        className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                        Keluar dari Akun
                    </button>
                </div>
            </div>
        </>
    );
}
