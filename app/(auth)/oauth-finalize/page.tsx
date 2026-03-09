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
    const redirect = useMemo(
        () => getSafeRedirect(searchParams.get("redirect")),
        [searchParams],
    );
    const provider = searchParams.get("provider") === "credentials" ? "credentials" : "google";

    const [state, setState] = useState<FinalizeState>("loading");
    const [message, setMessage] = useState("Menyelesaikan sesi login Anda...");

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
                    setMessage(data?.message || "Sesi login tidak valid. Silakan coba masuk lagi.");
                    return;
                }

                router.replace(data.redirectTo || redirect);
                router.refresh();
            } catch {
                if (cancelled) {
                    return;
                }

                setState("error");
                setMessage("Terjadi gangguan jaringan saat menyelesaikan login.");
            }
        }

        finalizeLogin();

        return () => {
            cancelled = true;
        };
    }, [provider, redirect, router]);

    return (
        <AuthShell
            eyebrow="Account Access"
            title="Menyiapkan Sesi Login"
            description="Kami sedang menautkan sesi Auth.js ke akun internal Duel Standby agar role, team, dan izin dashboard Anda langsung sinkron."
            footer={
                <Link href="/" className="font-semibold text-ds-amber transition-colors hover:text-ds-gold">
                    Kembali ke homepage
                </Link>
            }
        >
            <div className="mx-auto w-full max-w-xl rounded-[28px] border border-white/10 bg-black/10 p-5 text-center sm:p-6">
                {state === "loading" ? (
                    <>
                        <div className="relative mx-auto h-20 w-20">
                            <div className="absolute inset-0 animate-ping rounded-3xl bg-ds-amber/10" />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-ds-amber/20 bg-ds-amber/12 text-sm font-black uppercase tracking-[0.22em] text-ds-amber">
                                Sync
                            </div>
                        </div>
                        <h3 className="mt-5 text-2xl font-black tracking-tight text-white">Menyinkronkan Akses</h3>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/55">{message}</p>
                    </>
                ) : null}

                {state === "error" ? (
                    <>
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/15 text-3xl font-black text-red-400">
                            !
                        </div>
                        <h3 className="mt-5 text-2xl font-black tracking-tight text-white">Login Belum Selesai</h3>
                        <div className={`${authAlertCls} mx-auto mt-4 max-w-lg border-red-500/20 bg-red-500/10 text-red-400`}>
                            {message}
                        </div>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Link href="/login" className={authPrimaryBtnCls}>
                                Kembali ke Login
                            </Link>
                            <Link href="/" className={authSecondaryBtnCls}>
                                Ke Homepage
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
