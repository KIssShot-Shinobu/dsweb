"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import {
    AuthShell,
    authAlertCls,
    authInputCls,
    authLabelCls,
    authPrimaryBtnCls,
    authSecondaryBtnCls,
} from "@/components/auth/auth-shell";
import { DiscordIcon, GoogleIcon } from "@/components/auth/oauth-icons";

const errCls = "mt-1 text-xs text-red-400";

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/dashboard";
    const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [discordLoading, setDiscordLoading] = useState(false);
    const [googleEnabled, setGoogleEnabled] = useState(false);
    const [discordEnabled, setDiscordEnabled] = useState(false);

    const setField = (key: keyof typeof form, value: string) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const validate = () => {
        const nextErrors: Record<string, string> = {};
        if (!form.fullName || form.fullName.trim().length < 2) nextErrors.fullName = "Nama minimal 2 karakter";
        if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = "Masukkan alamat email yang valid";
        if (!form.password || form.password.length < 8) nextErrors.password = "Password minimal 8 karakter";
        if (!/[A-Za-z]/.test(form.password)) nextErrors.password = "Password harus mengandung huruf";
        if (!/[0-9]/.test(form.password)) nextErrors.password = "Password harus mengandung angka";
        if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Konfirmasi password belum cocok";
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (submitting) return;
        if (!validate()) return;
        setSubmitting(true);
        setServerError(null);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const result = await response.json();

            if (result.success) {
                router.push("/register/success");
                return;
            }

            if (result.errors && typeof result.errors === "object") {
                const nextErrors: Record<string, string> = {};
                for (const [key, value] of Object.entries(result.errors as Record<string, string | string[]>)) {
                    nextErrors[key] = Array.isArray(value) ? value[0] : value;
                }
                setErrors(nextErrors);
            }

            setServerError(result.message || "Pendaftaran belum berhasil diproses.");
        } catch {
            setServerError("Koneksi sedang bermasalah. Silakan coba lagi.");
        } finally {
            setSubmitting(false);
        }
    };

    const Err = ({ field }: { field: string }) => (errors[field] ? <p className={errCls}>{errors[field]}</p> : null);

    useEffect(() => {
        let active = true;

        fetch("/api/auth/providers")
            .then((response) => (response.ok ? response.json() : null))
            .then((providers) => {
                if (!active) return;
                setGoogleEnabled(Boolean(providers?.google));
                setDiscordEnabled(Boolean(providers?.discord));
            })
            .catch(() => {
                if (!active) return;
                setGoogleEnabled(false);
                setDiscordEnabled(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const handleGoogleRegister = async () => {
        setGoogleLoading(true);
        setServerError(null);
        try {
            await signOut({ redirect: false });
            await signIn("google", {
                callbackUrl: `/oauth-finalize?provider=google&redirect=${encodeURIComponent(redirect)}`,
            });
        } catch {
            setServerError("Daftar dengan Google belum berhasil. Silakan coba kembali.");
            setGoogleLoading(false);
        }
    };

    const handleDiscordRegister = async () => {
        setDiscordLoading(true);
        setServerError(null);
        try {
            await signOut({ redirect: false });
            await signIn("discord", {
                callbackUrl: `/oauth-finalize?provider=discord&redirect=${encodeURIComponent(redirect)}`,
            });
        } catch {
            setServerError("Daftar dengan Discord belum berhasil. Silakan coba kembali.");
            setDiscordLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Pendaftaran Akun"
            title="Buat akun Duel Standby"
            description="Cukup isi nama, email, dan password. Data lainnya bisa Anda lengkapi nanti di dashboard profile atau settings."
            footer={
                <>
                    Sudah punya akun?{" "}
                    <Link href="/login" className="link link-hover font-semibold text-primary">
                        Masuk
                    </Link>
                </>
            }
        >
            {serverError ? <div className={`${authAlertCls} alert-error mb-5`}>{serverError}</div> : null}

            <div className="space-y-4">
                <div className="flex items-center justify-center gap-4">
                    <button
                        type="button"
                        onClick={googleEnabled ? handleGoogleRegister : undefined}
                        disabled={!googleEnabled || submitting || googleLoading || discordLoading}
                        className={`btn btn-outline btn-square tooltip h-14 w-14 ${!googleEnabled ? "opacity-60" : ""}`}
                        data-tip={googleEnabled ? "Daftar dengan Google" : "Google belum aktif"}
                        aria-label="Daftar dengan Google"
                    >
                        {googleLoading ? (
                            <span className="loading loading-spinner loading-xs" />
                        ) : (
                            <GoogleIcon className="h-6 w-6" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={discordEnabled ? handleDiscordRegister : undefined}
                        disabled={!discordEnabled || submitting || googleLoading || discordLoading}
                        className={`btn btn-outline btn-square tooltip h-14 w-14 ${!discordEnabled ? "opacity-60" : ""}`}
                        data-tip={discordEnabled ? "Daftar dengan Discord" : "Discord belum aktif"}
                        aria-label="Daftar dengan Discord"
                    >
                        {discordLoading ? (
                            <span className="loading loading-spinner loading-xs" />
                        ) : (
                            <DiscordIcon className="h-6 w-6" />
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-3 text-xs text-base-content/35">
                    <div className="h-px flex-1 bg-base-300" />
                    <span>atau daftar dengan email</span>
                    <div className="h-px flex-1 bg-base-300" />
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className={authLabelCls}>Nama Lengkap *</label>
                    <input
                        type="text"
                        className={authInputCls}
                        placeholder="Contoh: Dimas Putra"
                        value={form.fullName}
                        onChange={(event) => setField("fullName", event.target.value)}
                    />
                    <Err field="fullName" />
                </div>
                <div>
                    <label className={authLabelCls}>Email *</label>
                    <input
                        type="email"
                        className={authInputCls}
                        placeholder="you@email.com"
                        value={form.email}
                        onChange={(event) => setField("email", event.target.value)}
                    />
                    <Err field="email" />
                </div>
                <div>
                    <label className={authLabelCls}>Password *</label>
                    <input
                        type="password"
                        className={authInputCls}
                        placeholder="Minimal 8 karakter"
                        value={form.password}
                        onChange={(event) => setField("password", event.target.value)}
                    />
                    <Err field="password" />
                </div>
                <div>
                    <label className={authLabelCls}>Konfirmasi Password *</label>
                    <input
                        type="password"
                        className={authInputCls}
                        placeholder="Ulangi password"
                        value={form.confirmPassword}
                        onChange={(event) => setField("confirmPassword", event.target.value)}
                    />
                    <Err field="confirmPassword" />
                </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href="/" className={authSecondaryBtnCls}>
                    Kembali
                </Link>
                <button type="button" onClick={handleSubmit} disabled={submitting || googleLoading || discordLoading} className={authPrimaryBtnCls}>
                    {submitting ? "Mendaftar..." : "Daftar"}
                </button>
            </div>
        </AuthShell>
    );
}
