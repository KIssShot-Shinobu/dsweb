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
} from "@/components/auth/auth-shell";

const ERROR_MESSAGES: Record<string, string> = {
    banned: "Akses akun Anda sedang dibatasi. Silakan hubungi tim admin Duel Standby.",
    oauth_failed: "Masuk dengan Google belum berhasil. Silakan coba kembali.",
    invalid_credentials: "Username, email, atau kata sandi yang Anda masukkan belum sesuai.",
    access_denied: "Akun ini belum memiliki izin untuk melanjutkan login.",
};

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/dashboard";
    const errorParam = searchParams.get("error");

    const [form, setForm] = useState({ identifier: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleEnabled, setGoogleEnabled] = useState(false);
    const [error, setError] = useState<string | null>(errorParam ? ERROR_MESSAGES[errorParam] ?? "Terjadi kendala saat memproses login Anda." : null);

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
                setError(ERROR_MESSAGES[result?.code || ""] ?? "Login belum berhasil. Silakan coba lagi.");
                return;
            }

            const finalizeResponse = await fetch("/api/auth/finalize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: "credentials", redirect }),
            });
            const finalizeData = await finalizeResponse.json();

            if (!finalizeResponse.ok || !finalizeData.success) {
                setError(finalizeData.message || "Sesi akun belum dapat disiapkan.");
                await signOut({ redirect: false });
                return;
            }

            router.push(finalizeData.redirectTo || redirect);
            router.refresh();
        } catch {
            setError("Koneksi sedang bermasalah. Periksa jaringan Anda lalu coba lagi.");
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
                callbackUrl: `/oauth-finalize?provider=google&redirect=${encodeURIComponent(redirect)}`,
            });
        } catch {
            setError("Masuk dengan Google belum berhasil. Silakan coba kembali.");
            setGoogleLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Akses Akun"
            title="Masuk ke Duel Standby"
            description="Akses akun Anda untuk mengikuti turnamen, mengelola profil game, dan tetap terhubung dengan komunitas."
            footer={
                <>
                    Belum punya akun?{" "}
                    <Link href="/register" className="link link-hover font-semibold text-primary">
                        Buat akun
                    </Link>
                </>
            }
        >
            {error ? (
                <div className={`${authAlertCls} alert-error mb-4`}>
                    {error}
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={authLabelCls}>Username atau Email</label>
                    <input
                        type="text"
                        className={authInputCls}
                        placeholder="username atau email@domain.com"
                        value={form.identifier}
                        onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                        required
                        autoComplete="username"
                    />
                </div>

                <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                        <label className={authLabelCls}>Kata Sandi</label>
                        <Link href="/forgot-password" className="text-[11px] font-medium text-base-content/60 transition-colors hover:text-primary">
                            Lupa kata sandi?
                        </Link>
                    </div>
                    <input
                        type="password"
                        className={authInputCls}
                        placeholder="********"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        autoComplete="current-password"
                    />
                </div>

                <button type="submit" disabled={loading || googleLoading} className={authPrimaryBtnCls}>
                    {loading ? "Memproses masuk..." : "Masuk ke Akun"}
                </button>
            </form>

            {googleEnabled ? (
                <div className="mt-5">
                    <div className="flex items-center gap-3 text-xs text-base-content/35">
                        <div className="h-px flex-1 bg-base-300" />
                        <span>atau</span>
                        <div className="h-px flex-1 bg-base-300" />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading || googleLoading}
                        className="btn btn-outline mt-5 w-full rounded-box"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-base-100 text-base-content shadow-sm">
                            <Chrome className="h-4 w-4" />
                        </span>
                        <span>{googleLoading ? "Mengalihkan ke Google..." : "Lanjut dengan Google"}</span>
                    </button>
                </div>
            ) : null}
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
