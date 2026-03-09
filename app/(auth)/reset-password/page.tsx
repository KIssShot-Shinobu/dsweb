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
            setError("Token reset tidak ditemukan. Gunakan link terbaru dari email Anda.");
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
                setError(data.message || "Reset password gagal diproses.");
                return;
            }

            setSuccessMessage(data.message || "Password berhasil direset.");
            setTimeout(() => {
                router.push("/login");
            }, 1200);
        } catch {
            setSuccessMessage(null);
            setError("Network error. Periksa koneksi Anda lalu coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Password Reset"
            title="Atur password baru"
            description="Gunakan password baru yang kuat. Setelah berhasil, Anda bisa langsung login kembali dengan username atau email."
            footer={
                <>
                    Butuh link baru?{" "}
                    <Link href="/forgot-password" className="font-semibold text-ds-amber transition-colors hover:text-ds-gold">
                        Minta reset password lagi
                    </Link>
                </>
            }
        >
            {tokenMissing ? (
                <div className={`${authAlertCls} mb-5 border-amber-500/20 bg-amber-500/10 text-amber-300`}>
                    Token reset tidak ditemukan. Buka kembali link dari email atau minta link reset yang baru.
                </div>
            ) : null}

            {error ? (
                <div className={`${authAlertCls} mb-5 border-red-500/20 bg-red-500/10 text-red-400`}>
                    {error}
                </div>
            ) : null}

            {successMessage ? (
                <div className={`${authAlertCls} mb-5 border-emerald-500/20 bg-emerald-500/10 text-emerald-300`}>
                    <div className="font-medium">{successMessage}</div>
                    <p className="mt-2 text-sm text-emerald-200/80">Anda akan diarahkan ke halaman login.</p>
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="password" className={authLabelCls}>
                        Password Baru
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
                        Konfirmasi Password Baru
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        className={authInputCls}
                        placeholder="Ulangi password baru"
                        value={form.confirmPassword}
                        onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm leading-6 text-white/55">
                    Password harus mengandung minimal 8 karakter, huruf, dan angka.
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" disabled={loading || tokenMissing} className={authPrimaryBtnCls}>
                        {loading ? "Menyimpan..." : "Simpan Password Baru"}
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
