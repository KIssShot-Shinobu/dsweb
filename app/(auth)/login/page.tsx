"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    AuthShell,
    authAlertCls,
    authInputCls,
    authLabelCls,
    authPrimaryBtnCls,
} from "@/components/auth/auth-shell";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/dashboard";
    const errorParam = searchParams.get("error");

    const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(errorParam === "banned" ? "Akun Anda diblokir. Silakan hubungi admin." : null);

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
        <AuthShell
            eyebrow="Account Access"
            title="Masuk ke Duel Standby"
            description="Gunakan akun aktif Anda untuk membuka profile, tournament publik, atau dashboard operasional sesuai role komunitas Anda."
            footer={
                <>
                    Belum punya akun?{" "}
                    <Link href="/register" className="font-semibold text-ds-amber transition-colors hover:text-ds-gold">
                        Daftar sekarang
                    </Link>
                </>
            }
        >
            {error ? <div className={`${authAlertCls} mb-5 border-red-500/20 bg-red-500/10 text-red-400`}>{error}</div> : null}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={authLabelCls}>Email</label>
                    <input type="email" className={authInputCls} placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
                </div>
                <div>
                    <label className={authLabelCls}>Password</label>
                    <input type="password" className={authInputCls} placeholder="********" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                    <label htmlFor="rememberMe" className="flex cursor-pointer items-center gap-3 text-sm text-white/60">
                        <input type="checkbox" id="rememberMe" checked={form.rememberMe} onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })} className="h-4 w-4 rounded accent-ds-amber" />
                        Ingat saya
                    </label>
                    <span className="text-xs text-white/35">JWT cookie aman</span>
                </div>

                <button type="submit" disabled={loading} className={authPrimaryBtnCls}>
                    {loading ? "Masuk..." : "Masuk"}
                </button>
            </form>
        </AuthShell>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
