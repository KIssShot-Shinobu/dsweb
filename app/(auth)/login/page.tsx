"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import {
    AuthShell,
    authAlertCls,
    authInputCls,
    authLabelCls,
    authPrimaryBtnCls,
} from "@/components/auth/auth-shell";
import { DiscordIcon, GoogleIcon } from "@/components/auth/oauth-icons";
import { useLocale } from "@/hooks/use-locale";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLocale();
    const redirect = searchParams.get("redirect") || "/dashboard";
    const errorParam = searchParams.get("error");

    const [form, setForm] = useState({ identifier: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [discordLoading, setDiscordLoading] = useState(false);
    const [googleEnabled, setGoogleEnabled] = useState(false);
    const [discordEnabled, setDiscordEnabled] = useState(false);
    const errorMessages: Record<string, string> = {
        banned: t.auth.login.errors.banned,
        oauth_failed: t.auth.login.errors.oauthFailed,
        invalid_credentials: t.auth.login.errors.invalidCredentials,
        access_denied: t.auth.login.errors.accessDenied,
    };
    const [error, setError] = useState<string | null>(
        errorParam ? errorMessages[errorParam] ?? t.auth.login.errors.generic : null
    );

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
                setError(errorMessages[result?.code || ""] ?? t.auth.login.errors.retry);
                return;
            }

            const finalizeResponse = await fetch("/api/auth/finalize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: "credentials", redirect }),
            });
            const finalizeData = await finalizeResponse.json();

            if (!finalizeResponse.ok || !finalizeData.success) {
                setError(finalizeData.message || t.auth.login.errors.sessionFailed);
                await signOut({ redirect: false });
                return;
            }

            router.push(finalizeData.redirectTo || redirect);
            router.refresh();
        } catch {
            setError(t.auth.login.errors.network);
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
            setError(t.auth.login.errors.googleFailed);
            setGoogleLoading(false);
        }
    };

    const handleDiscordLogin = async () => {
        setDiscordLoading(true);
        setError(null);
        try {
            await signOut({ redirect: false });
            await signIn("discord", {
                callbackUrl: `/oauth-finalize?provider=discord&redirect=${encodeURIComponent(redirect)}`,
            });
        } catch {
            setError(t.auth.login.errors.discordFailed);
            setDiscordLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow={t.auth.login.eyebrow}
            title={t.auth.login.title}
            description={t.auth.login.description}
            footer={
                <>
                    {t.auth.login.footerPrompt}{" "}
                    <Link href="/register" className="link link-hover font-semibold text-primary">
                        {t.auth.login.footerAction}
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
                    <label className={authLabelCls}>{t.auth.login.identifierLabel}</label>
                    <input
                        type="text"
                        className={authInputCls}
                        placeholder={t.auth.login.identifierPlaceholder}
                        value={form.identifier}
                        onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                        required
                        autoComplete="username"
                    />
                </div>

                <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                        <label className={authLabelCls}>{t.auth.login.passwordLabel}</label>
                        <Link href="/forgot-password" className="text-[11px] font-medium text-base-content/60 transition-colors hover:text-primary">
                            {t.auth.login.forgotPassword}
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

                <button type="submit" disabled={loading || googleLoading || discordLoading} className={authPrimaryBtnCls}>
                    {loading ? t.auth.login.loading : t.auth.login.submit}
                </button>
            </form>

            {(googleEnabled || discordEnabled) ? (
                <div className="mt-5 space-y-4">
                    <div className="flex items-center gap-3 text-xs text-base-content/35">
                        <div className="h-px flex-1 bg-base-300" />
                        <span>{t.auth.login.or}</span>
                        <div className="h-px flex-1 bg-base-300" />
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <button
                            type="button"
                            onClick={googleEnabled ? handleGoogleLogin : undefined}
                            disabled={!googleEnabled || loading || googleLoading || discordLoading}
                            className={`btn btn-outline btn-square tooltip h-14 w-14 ${!googleEnabled ? "opacity-60" : ""}`}
                            data-tip={googleEnabled ? t.auth.login.continueGoogle : t.auth.login.googleInactive}
                            aria-label={t.auth.login.continueGoogle}
                        >
                            {googleLoading ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                <GoogleIcon className="h-6 w-6" />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={discordEnabled ? handleDiscordLogin : undefined}
                            disabled={!discordEnabled || loading || googleLoading || discordLoading}
                            className={`btn btn-outline btn-square tooltip h-14 w-14 ${!discordEnabled ? "opacity-60" : ""}`}
                            data-tip={discordEnabled ? t.auth.login.continueDiscord : t.auth.login.discordInactive}
                            aria-label={t.auth.login.continueDiscord}
                        >
                            {discordLoading ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                <DiscordIcon className="h-6 w-6" />
                            )}
                        </button>
                    </div>
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
