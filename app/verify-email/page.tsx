"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    AuthShell,
    authAlertCls,
    authPrimaryBtnCls,
    authSecondaryBtnCls,
} from "@/components/auth/auth-shell";

type VerificationState = "verifying" | "success" | "error";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [state, setState] = useState<VerificationState>("verifying");
    const [message, setMessage] = useState("Memverifikasi email Anda...");

    useEffect(() => {
        let cancelled = false;

        async function verifyEmail() {
            if (!token) {
                if (!cancelled) {
                    setState("error");
                    setMessage("Link verifikasi tidak valid atau token tidak ditemukan.");
                }
                return;
            }

            try {
                const response = await fetch("/api/auth/verify-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });
                const data = await response.json();

                if (cancelled) return;

                if (!response.ok || !data.success) {
                    setState("error");
                    setMessage(data.message || "Verifikasi email gagal. Silakan minta link baru.");
                    return;
                }

                setState("success");
                setMessage(data.message || "Email berhasil diverifikasi.");
            } catch {
                if (!cancelled) {
                    setState("error");
                    setMessage("Terjadi gangguan jaringan saat memverifikasi email.");
                }
            }
        }

        verifyEmail();

        return () => {
            cancelled = true;
        };
    }, [token]);

    return (
        <AuthShell
            eyebrow="Email Verification"
            title="Verifikasi Email"
            description="Konfirmasi alamat email Anda untuk mengamankan akun dan menyelesaikan proses akses ke Duel Standby."
            footer={
                <Link href="/" className="font-semibold text-ds-amber transition-colors hover:text-ds-gold">
                    Kembali ke homepage
                </Link>
            }
        >
            <div className="mx-auto w-full max-w-xl rounded-[28px] border border-white/10 bg-black/10 p-5 text-center sm:p-6">
                {state === "verifying" ? (
                    <>
                        <div className="relative mx-auto h-20 w-20">
                            <div className="absolute inset-0 animate-ping rounded-3xl bg-ds-amber/10" />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-ds-amber/20 bg-ds-amber/12 text-sm font-black uppercase tracking-[0.22em] text-ds-amber">
                                Wait
                            </div>
                        </div>
                        <h3 className="mt-5 text-2xl font-black tracking-tight text-white">Memverifikasi Email</h3>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/55">{message}</p>
                        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm leading-6 text-white/45">
                            Link verifikasi hanya dipakai sekali. Mohon tunggu sebentar selama sistem mencocokkan token email Anda.
                        </div>
                    </>
                ) : null}

                {state === "success" ? (
                    <>
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/15 text-3xl font-black text-emerald-400">
                            OK
                        </div>
                        <h3 className="mt-5 text-2xl font-black tracking-tight text-white">Email Berhasil Diverifikasi</h3>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/55">{message}</p>
                        <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm leading-6 text-emerald-200/90">
                                Status email Anda sudah aktif dan siap dipakai untuk login.
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/45">
                                Jika Anda baru selesai daftar, langkah berikutnya cukup masuk dengan email dan password yang sudah dibuat.
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Link href="/login" className={authPrimaryBtnCls}>
                                Login Sekarang
                            </Link>
                            <Link href="/" className={authSecondaryBtnCls}>
                                Kembali ke Homepage
                            </Link>
                        </div>
                    </>
                ) : null}

                {state === "error" ? (
                    <>
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/15 text-3xl font-black text-red-400">
                            !
                        </div>
                        <h3 className="mt-5 text-2xl font-black tracking-tight text-white">Verifikasi Belum Berhasil</h3>
                        <div className={`${authAlertCls} mx-auto mt-4 max-w-lg border-red-500/20 bg-red-500/10 text-red-400`}>
                            {message}
                        </div>
                        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm leading-6 text-white/45">
                            Kemungkinan link ini sudah pernah dipakai atau masa berlakunya sudah habis. Jika Anda masih belum bisa login, kirim ulang verifikasi dari akun Anda setelah berhasil masuk.
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

export default function VerifyEmailPage() {
    return (
        <Suspense>
            <VerifyEmailContent />
        </Suspense>
    );
}
