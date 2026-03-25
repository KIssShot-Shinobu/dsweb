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
import { useLocale } from "@/hooks/use-locale";

const errCls = "mt-1 text-xs text-red-400";

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLocale();
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
        if (!form.fullName || form.fullName.trim().length < 2) nextErrors.fullName = t.auth.register.errors.fullNameMin;
        if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = t.auth.register.errors.emailInvalid;
        if (!form.password || form.password.length < 8) nextErrors.password = t.auth.register.errors.passwordMin;
        if (!/[A-Za-z]/.test(form.password)) nextErrors.password = t.auth.register.errors.passwordLetter;
        if (!/[0-9]/.test(form.password)) nextErrors.password = t.auth.register.errors.passwordNumber;
        if (form.password !== form.confirmPassword) nextErrors.confirmPassword = t.auth.register.errors.passwordMismatch;
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

            setServerError(result.message || t.auth.register.errors.serverFailed);
        } catch {
            setServerError(t.auth.register.errors.network);
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
            setServerError(t.auth.register.errors.googleFailed);
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
            setServerError(t.auth.register.errors.discordFailed);
            setDiscordLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow={t.auth.register.eyebrow}
            title={t.auth.register.title}
            description={t.auth.register.description}
            footer={
                <>
                    {t.auth.register.footerPrompt}{" "}
                    <Link href="/login" className="link link-hover font-semibold text-primary">
                        {t.auth.register.footerAction}
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
                        data-tip={googleEnabled ? t.auth.register.continueGoogle : t.auth.register.googleInactive}
                        aria-label={t.auth.register.continueGoogle}
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
                        data-tip={discordEnabled ? t.auth.register.continueDiscord : t.auth.register.discordInactive}
                        aria-label={t.auth.register.continueDiscord}
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
                    <span>{t.auth.register.orEmail}</span>
                    <div className="h-px flex-1 bg-base-300" />
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className={authLabelCls}>{t.auth.register.fullNameLabel}</label>
                    <input
                        type="text"
                        className={authInputCls}
                        placeholder={t.auth.register.fullNamePlaceholder}
                        value={form.fullName}
                        onChange={(event) => setField("fullName", event.target.value)}
                    />
                    <Err field="fullName" />
                </div>
                <div>
                    <label className={authLabelCls}>{t.auth.register.emailLabel}</label>
                    <input
                        type="email"
                        className={authInputCls}
                        placeholder={t.auth.register.emailPlaceholder}
                        value={form.email}
                        onChange={(event) => setField("email", event.target.value)}
                    />
                    <Err field="email" />
                </div>
                <div>
                    <label className={authLabelCls}>{t.auth.register.passwordLabel}</label>
                    <input
                        type="password"
                        className={authInputCls}
                        placeholder={t.auth.register.passwordPlaceholder}
                        value={form.password}
                        onChange={(event) => setField("password", event.target.value)}
                    />
                    <Err field="password" />
                </div>
                <div>
                    <label className={authLabelCls}>{t.auth.register.confirmPasswordLabel}</label>
                    <input
                        type="password"
                        className={authInputCls}
                        placeholder={t.auth.register.confirmPasswordPlaceholder}
                        value={form.confirmPassword}
                        onChange={(event) => setField("confirmPassword", event.target.value)}
                    />
                    <Err field="confirmPassword" />
                </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href="/" className={authSecondaryBtnCls}>
                    {t.auth.register.back}
                </Link>
                <button type="button" onClick={handleSubmit} disabled={submitting || googleLoading || discordLoading} className={authPrimaryBtnCls}>
                    {submitting ? t.auth.register.submitting : t.auth.register.submit}
                </button>
            </div>
        </AuthShell>
    );
}
