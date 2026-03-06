"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const inputCls = "w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 outline-none focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 transition-all";
const labelCls = "block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/dashboard";
    const errorParam = searchParams.get("error");

    const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(
        errorParam === "pending" ? "Akun Anda masih menunggu persetujuan admin." : null
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (data.success) {
                router.push(redirect);
                router.refresh();
            } else {
                setError(data.message || "Login gagal.");
            }
        } catch {
            setError("Network error. Periksa koneksi Anda.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Logo / Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ds-amber mb-4">
                    <span className="text-2xl font-black text-black">DS</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">Duel Standby Guild</h1>
                <p className="text-sm text-white/40">Masuk ke akun Anda</p>
            </div>

            {/* Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                {error && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelCls}>Email</label>
                        <input
                            type="email"
                            className={inputCls}
                            placeholder="your@email.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Password</label>
                        <input
                            type="password"
                            className={inputCls}
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={form.rememberMe}
                            onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
                            className="w-4 h-4 rounded accent-ds-amber"
                        />
                        <label htmlFor="rememberMe" className="text-sm text-white/50 cursor-pointer">Ingat saya</label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-ds-amber hover:bg-ds-gold text-black font-bold text-sm transition-all disabled:opacity-50 mt-2"
                    >
                        {loading ? "Masuk..." : "Masuk"}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                    <p className="text-sm text-white/40">
                        Belum punya akun?{" "}
                        <Link href="/register" className="text-ds-amber hover:text-ds-gold font-semibold transition-colors">
                            Daftar sekarang
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
