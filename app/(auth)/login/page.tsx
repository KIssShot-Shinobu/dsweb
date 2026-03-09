"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Chrome } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import {
    AuthShell,
    authAlertCls,
    authInputCls,
    authLabelCls,
    authPrimaryBtnCls,
    authSecondaryBtnCls,
} from "@/components/auth/auth-shell";

const ERROR_MESSAGES: Record<string, string> = {
    banned: "Akun Anda diblokir. Silakan hubungi admin.",
    oauth_failed: "Login Google tidak berhasil. Coba lagi atau gunakan login biasa.",
    invalid_credentials: "Username/email atau password salah.",
    access_denied: "Akses login ditolak untuk akun ini.",
};

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/dashboard";
    const errorParam = searchParams.get("error");

    const [form, setForm] = useState({ identifier: "", password: "", rememberMe: false });
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleEnabled, setGoogleEnabled] = useState(false);
    const [error, setError] = useState<string | null>(errorParam ? ERROR_MESSAGES[errorParam] ?? "Terjadi gangguan saat login." : null);

    useEffect(() => {
        let active = true;

        fetch("/api/auth/providers")
            .then((response) => (response.ok ? response.json() : null))
            .then((providers) => {
                if (!active) return;
                setGoogleEnabled(Boolean(providers?.google));
            })
            .catch(() => {
                if (!active) return;
                setGoogleEnabled(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await signOut({ redirect: false });
            const result = await signIn("credentials", {
                identifier: form.identifier,
                password: form.password,
                redirect: false,
            });

            if (!result?.ok) {
                setError(ERROR_MESSAGES[result?.code || ""] ?? "Login gagal. Coba lagi.");
                return;
            }

            const finalizeResponse = await fetch("/api/auth/finalize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: "credentials", redirect }),
            });
            const finalizeData = await finalizeResponse.json();

            if (!finalizeResponse.ok || !finalizeData.success) {
                setError(finalizeData.message || "Sesi login tidak berhasil dibuat.");
                await signOut({ redirect: false });
                return;
            }

            router.push(finalizeData.redirectTo || redirect);
            router.refresh();
        } catch {
            setError("Network error. Periksa koneksi Anda.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError(null);
        try {
            await signOut({ redirect: false });
            await signIn("google", {
                callbackUrl: `/api/auth/finalize?provider=google&redirect=${encodeURIComponent(redirect)}`,
            });
        } catch {
            setError("Login Google tidak berhasil. Coba lagi.");
            setGoogleLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Account Access"
            title="Masuk ke Duel Standby"
            description="Gunakan username, email, atau Google untuk membuka profile, tournament publik, dan dashboard sesuai role komunitas Anda."
            footer={
                <>
                    Belum punya akun?{" "}
                    <Link href="/register" className="font-semibold text-ds-amber transition-colors hover:text-ds-gold">
                        Daftar sekarang
                    </Link>
                </>
            }
        >
            {error ? <div className={`${authAlertCls} mb-5 border-red-500/20 bg-red-500/10 text-red-400`}><div>{error}</div>{errorParam === "oauth_failed" ? <div className="mt-2 text-xs text-red-200/80">Pastikan popup Google tidak diblok, lalu coba lagi. Jika tetap gagal, masuk dengan username atau email seperti biasa.</div> : null}</div> : null}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={authLabelCls}>Username atau Email</label>
                    <input type="text" className={authInputCls} placeholder="username atau your@email.com" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required autoComplete="username" />
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
                    <Link href="/forgot-password" className="text-xs font-medium text-ds-amber/90 transition-colors hover:text-ds-gold">
                        Lupa password?
                    </Link>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button type="submit" disabled={loading || googleLoading} className={authPrimaryBtnCls}>
                        {loading ? "Masuk..." : "Masuk"}
                    </button>
                    {googleEnabled ? (
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading || googleLoading}
                            className={`${authSecondaryBtnCls} gap-2`}
                        >
                            <Chrome className="h-4 w-4" />
                            <span>{googleLoading ? "Mengalihkan..." : "Masuk dengan Google"}</span>
                        </button>
                    ) : null}
                </div>

                {googleEnabled ? (
                    <p className="text-xs leading-6 text-white/45">
                        Login Google dipakai untuk akses cepat. Role komunitas, team, dan izin dashboard tetap mengikuti akun Duel Standby Anda.
                    </p>
                ) : null}
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


