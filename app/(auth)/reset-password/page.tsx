"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    AuthShell,
    authAlertCls,
    authInputCls,
    authLabelCls,
    authPrimaryBtnCls,
    authSecondaryBtnCls,
} from "@/components/auth/auth-shell";

type ResetPasswordResponse = {
    success: boolean;
    message?: string;
};

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [form, setForm] = useState({
        password: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const tokenMissing = useMemo(() => token.trim().length === 0, [token]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (tokenMissing) {
            setError("Token reset tidak ditemukan. Gunakan tautan terbaru dari email Anda.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/password/reset", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    password: form.password,
                    confirmPassword: form.confirmPassword,
                }),
            });

            const data = (await response.json()) as ResetPasswordResponse;

            if (!response.ok || !data.success) {
                setSuccessMessage(null);
                setError(data.message || "Pengaturan ulang kata sandi belum berhasil diproses.");
                return;
            }

            setSuccessMessage(data.message || "Kata sandi berhasil diperbarui.");
            setTimeout(() => {
                router.push("/login");
            }, 1200);
        } catch {
            setSuccessMessage(null);
            setError("Koneksi sedang bermasalah. Periksa jaringan Anda lalu coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Reset Kata Sandi"
            title="Buat kata sandi baru"
            description="Gunakan kata sandi yang kuat agar akun Anda tetap aman. Setelah berhasil, Anda bisa langsung login kembali."
            footer={
                <>
                    Butuh tautan baru?{" "}
                    <Link href="/forgot-password" className="link link-hover font-semibold text-primary">
                        Minta reset ulang
                    </Link>
                </>
            }
        >
            {tokenMissing ? (
                <div className={`${authAlertCls} alert-warning mb-5`}>
                    Token reset tidak ditemukan. Buka kembali tautan dari email atau minta tautan reset yang baru.
                </div>
            ) : null}

            {error ? (
                <div className={`${authAlertCls} alert-error mb-5`}>
                    {error}
                </div>
            ) : null}

            {successMessage ? (
                <div className={`${authAlertCls} alert-success mb-5`}>
                    <div className="font-medium">{successMessage}</div>
                    <p className="mt-2 text-sm">Anda akan diarahkan ke halaman login dalam beberapa detik.</p>
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="password" className={authLabelCls}>
                        Kata Sandi Baru
                    </label>
                    <input
                        id="password"
                        type="password"
                        className={authInputCls}
                        placeholder="Minimal 8 karakter"
                        value={form.password}
                        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="confirmPassword" className={authLabelCls}>
                        Konfirmasi Kata Sandi Baru
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        className={authInputCls}
                        placeholder="Ulangi kata sandi baru"
                        value={form.confirmPassword}
                        onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div className="rounded-box border border-base-300 bg-base-200/50 px-4 py-3 text-sm leading-6 text-base-content/60">
                    Kata sandi harus terdiri dari minimal 8 karakter serta mengandung huruf dan angka.
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" disabled={loading || tokenMissing} className={authPrimaryBtnCls}>
                        {loading ? "Menyimpan..." : "Simpan Kata Sandi Baru"}
                    </button>
                    <Link href="/login" className={authSecondaryBtnCls}>
                        Kembali ke Login
                    </Link>
                </div>
            </form>
        </AuthShell>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordForm />
        </Suspense>
    );
}
