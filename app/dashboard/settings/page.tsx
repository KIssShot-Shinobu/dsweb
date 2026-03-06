"use client";

import { useState } from "react";

export default function SettingsPage() {
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 transition-all";
    const labelCls = "block text-xs font-semibold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-1.5";

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.newPassword !== form.confirmPassword) { setError("Password baru tidak cocok."); return; }
        if (form.newPassword.length < 8) { setError("Password baru minimal 8 karakter."); return; }
        setLoading(true);
        setError(null);
        // TODO: API call to change password
        setTimeout(() => { setLoading(false); setSaved(true); setTimeout(() => setSaved(false), 3000); }, 800);
    };

    return (
        <>
            <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Pengaturan</h1>
                <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Kelola preferensi akun Anda</p>
            </div>

            <div className="max-w-lg space-y-4">
                {/* Change Password */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 p-5">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Ubah Password</h3>
                    {error && <div className="mb-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}
                    {saved && <div className="mb-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">Password berhasil diubah!</div>}
                    <form onSubmit={handleChangePassword} className="space-y-3">
                        <div>
                            <label className={labelCls}>Password Saat Ini</label>
                            <input type="password" className={inputCls} placeholder="••••••••" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
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

                {/* Account Actions */}
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
