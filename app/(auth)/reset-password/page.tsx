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
import { useLocale } from "@/hooks/use-locale";

type ResetPasswordResponse = {
    success: boolean;
    message?: string;
};

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";
    const { t } = useLocale();

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
            setError(t.auth.reset.errors.tokenMissing);
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
                setError(data.message || t.auth.reset.errors.requestFailed);
                return;
            }

            setSuccessMessage(data.message || t.auth.reset.successMessage);
            setTimeout(() => {
                router.push("/login");
            }, 1200);
        } catch {
            setSuccessMessage(null);
            setError(t.auth.reset.errors.network);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow={t.auth.reset.eyebrow}
            title={t.auth.reset.title}
            description={t.auth.reset.description}
            footer={
                <>
                    {t.auth.reset.footerPrompt}{" "}
                    <Link href="/forgot-password" className="link link-hover font-semibold text-primary">
                        {t.auth.reset.footerAction}
                    </Link>
                </>
            }
        >
            {tokenMissing ? (
                <div className={`${authAlertCls} alert-warning mb-5`}>
                    {t.auth.reset.tokenMissingNotice}
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
                    <p className="mt-2 text-sm">{t.auth.reset.redirectNotice}</p>
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="password" className={authLabelCls}>
                        {t.auth.reset.passwordLabel}
                    </label>
                    <input
                        id="password"
                        type="password"
                        className={authInputCls}
                        placeholder={t.auth.reset.passwordPlaceholder}
                        value={form.password}
                        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="confirmPassword" className={authLabelCls}>
                        {t.auth.reset.confirmPasswordLabel}
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        className={authInputCls}
                        placeholder={t.auth.reset.confirmPasswordPlaceholder}
                        value={form.confirmPassword}
                        onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div className="rounded-box border border-base-300 bg-base-200/50 px-4 py-3 text-sm leading-6 text-base-content/60">
                    {t.auth.reset.passwordHint}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" disabled={loading || tokenMissing} className={authPrimaryBtnCls}>
                        {loading ? t.auth.reset.loading : t.auth.reset.submit}
                    </button>
                    <Link href="/login" className={authSecondaryBtnCls}>
                        {t.auth.reset.backToLogin}
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
