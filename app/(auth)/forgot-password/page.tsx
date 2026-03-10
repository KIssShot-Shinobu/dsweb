"use client";

import Link from "next/link";
import { useState } from "react";
import {
    AuthShell,
    authAlertCls,
    authInputCls,
    authLabelCls,
    authPrimaryBtnCls,
    authSecondaryBtnCls,
} from "@/components/auth/auth-shell";

type ForgotPasswordResponse = {
    success: boolean;
    message?: string;
    debugResetUrl?: string;
};

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/password/forgot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = (await response.json()) as ForgotPasswordResponse;

            if (!response.ok || !data.success) {
                setSuccessMessage(null);
                setDebugResetUrl(null);
                setError(data.message || "Permintaan pengaturan ulang kata sandi belum dapat diproses.");
                return;
            }

            setSuccessMessage(data.message || "Jika email Anda terdaftar, tautan pengaturan ulang sudah dikirim.");
            setDebugResetUrl(data.debugResetUrl || null);
        } catch {
            setSuccessMessage(null);
            setDebugResetUrl(null);
            setError("Koneksi sedang bermasalah. Periksa jaringan Anda lalu coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Pemulihan Akun"
            title="Atur ulang kata sandi"
            description="Masukkan email akun Anda. Jika terdaftar, kami akan mengirimkan tautan reset yang berlaku selama 15 menit."
            footer={
                <>
                    Sudah ingat kata sandi?{" "}
                    <Link href="/login" className="link link-hover font-semibold text-primary">
                        Kembali ke login
                    </Link>
                </>
            }
        >
            {error ? (
                <div className={`${authAlertCls} alert-error mb-5`}>
                    {error}
                </div>
            ) : null}

            {successMessage ? (
                <div className={`${authAlertCls} alert-success mb-5`}>
                    <div className="font-medium">{successMessage}</div>
                    <p className="mt-2 text-sm">
                        Periksa inbox, folder spam, atau tab promosi jika email belum terlihat.
                    </p>
                    {debugResetUrl ? (
                        <div className="mt-3 rounded-box border border-success/30 bg-base-100/50 p-3 text-xs">
                            <div className="mb-1 font-semibold uppercase tracking-[0.18em]">
                                Debug URL (Dev)
                            </div>
                            <Link href={debugResetUrl} className="link break-all">
                                {debugResetUrl}
                            </Link>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className={authLabelCls}>
                        Email Akun
                    </label>
                    <input
                        id="email"
                        type="email"
                        className={authInputCls}
                        placeholder="username@email.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        required
                    />
                </div>

                <div className="rounded-box border border-base-300 bg-base-200/50 px-4 py-3 text-sm leading-6 text-base-content/60">
                    Demi keamanan, kami selalu menampilkan respons yang sama, baik email tersebut terdaftar maupun tidak.
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" disabled={loading} className={authPrimaryBtnCls}>
                        {loading ? "Mengirim tautan..." : "Kirim Tautan Reset"}
                    </button>
                    <Link href="/login" className={authSecondaryBtnCls}>
                        Batal
                    </Link>
                </div>
            </form>
        </AuthShell>
    );
}
