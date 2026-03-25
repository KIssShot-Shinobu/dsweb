"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    AuthShell,
    authAlertCls,
    authPrimaryBtnCls,
    authSecondaryBtnCls,
} from "@/components/auth/auth-shell";
import { useLocale } from "@/hooks/use-locale";

type FinalizeState = "loading" | "error";

function getSafeRedirect(input: string | null) {
    if (!input) {
        return "/dashboard";
    }

    if (!input.startsWith("/") || input.startsWith("//")) {
        return "/dashboard";
    }

    return input;
}

function OAuthFinalizeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLocale();
    const redirect = useMemo(
        () => getSafeRedirect(searchParams.get("redirect")),
        [searchParams],
    );
    const providerParam = searchParams.get("provider");
    const provider =
        providerParam === "credentials" || providerParam === "google" || providerParam === "discord"
            ? providerParam
            : "google";

    const [state, setState] = useState<FinalizeState>("loading");
    const [message, setMessage] = useState(t.auth.oauth.loadingMessage);

    useEffect(() => {
        let cancelled = false;

        async function finalizeLogin() {
            try {
                const response = await fetch("/api/auth/finalize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ provider, redirect }),
                });
                const data = await response.json().catch(() => null);

                if (cancelled) {
                    return;
                }

                if (!response.ok || !data?.success) {
                    setState("error");
                    setMessage(data?.message || t.auth.oauth.errors.invalidSession);
                    return;
                }

                router.replace(data.redirectTo || redirect);
                router.refresh();
            } catch {
                if (cancelled) {
                    return;
                }

                setState("error");
                setMessage(t.auth.oauth.errors.network);
            }
        }

        finalizeLogin();

        return () => {
            cancelled = true;
        };
    }, [provider, redirect, router]);

    return (
        <AuthShell
            eyebrow={t.auth.oauth.eyebrow}
            title={t.auth.oauth.title}
            description={t.auth.oauth.description}
            footer={
                <Link href="/" className="font-semibold text-ds-amber transition-colors hover:text-ds-gold">
                    {t.auth.oauth.backHome}
                </Link>
            }
        >
            <div className="mx-auto w-full max-w-xl rounded-[28px] border border-white/10 bg-black/10 p-5 text-center sm:p-6">
                {state === "loading" ? (
                    <>
                        <div className="relative mx-auto h-20 w-20">
                            <div className="absolute inset-0 animate-ping rounded-3xl bg-ds-amber/10" />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-ds-amber/20 bg-ds-amber/12 text-sm font-black uppercase tracking-[0.22em] text-ds-amber">
                                {t.auth.oauth.syncBadge}
                            </div>
                        </div>
                        <h3 className="mt-5 text-2xl font-black tracking-tight text-white">{t.auth.oauth.syncTitle}</h3>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/55">{message}</p>
                    </>
                ) : null}

                {state === "error" ? (
                    <>
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/15 text-3xl font-black text-red-400">
                            !
                        </div>
                        <h3 className="mt-5 text-2xl font-black tracking-tight text-white">{t.auth.oauth.errorTitle}</h3>
                        <div className={`${authAlertCls} mx-auto mt-4 max-w-lg border-red-500/20 bg-red-500/10 text-red-400`}>
                            {message}
                        </div>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Link href="/login" className={authPrimaryBtnCls}>
                                {t.auth.oauth.backToLogin}
                            </Link>
                            <Link href="/" className={authSecondaryBtnCls}>
                                {t.auth.oauth.backHomeSecondary}
                            </Link>
                        </div>
                    </>
                ) : null}
            </div>
        </AuthShell>
    );
}

export default function OAuthFinalizePage() {
    return (
        <Suspense>
            <OAuthFinalizeContent />
        </Suspense>
    );
}
