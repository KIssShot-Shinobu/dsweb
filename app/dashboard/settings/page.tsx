"use client";

import { useEffect, useState } from "react";
import { btnDanger, btnOutline, btnPrimary, dashboardStackCls, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";
import { clientLogout } from "@/lib/client-auth";
import { useLocale } from "@/hooks/use-locale";

type MeUser = {
    id: string;
    username: string;
    email: string;
    fullName: string;
    emailVerified: boolean;
};

export default function SettingsPage() {
    const { t } = useLocale();
    const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [me, setMe] = useState<MeUser | null>(null);
    const [meLoading, setMeLoading] = useState(true);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyMessage, setVerifyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
                if (data?.success && data.user) {
                    setMe({
                        id: data.user.id,
                        username: data.user.username ?? data.user.fullName,
                        email: data.user.email,
                        fullName: data.user.fullName,
                        emailVerified: Boolean(data.user.emailVerified),
                    });
                } else {
                    setMe(null);
                }
            })
            .catch(() => setMe(null))
            .finally(() => setMeLoading(false));
    }, []);

    const handleResendVerification = async () => {
        setVerifyLoading(true);
        setVerifyMessage(null);
        try {
            const response = await fetch("/api/auth/verify-email/resend", { method: "POST" });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                setVerifyMessage({ type: "error", text: data?.message || t.dashboard.settings.verification.resendFailed });
                return;
            }
            setVerifyMessage({ type: "success", text: data.message || t.dashboard.settings.verification.resendSuccess });
        } catch {
            setVerifyMessage({ type: "error", text: t.dashboard.settings.verification.networkError });
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleChangePassword = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch("/api/auth/password/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await response.json();

            if (!response.ok || !data?.success) {
                setError(data?.message || t.dashboard.settings.password.changeFailed);
                return;
            }

            setSuccessMessage(data.message || t.dashboard.settings.password.changeSuccess);
            setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setTimeout(() => {
                void clientLogout("/login");
            }, 1200);
        } catch {
            setError(t.dashboard.settings.password.networkError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardPageShell>
            <div className={dashboardStackCls}>
                <DashboardPageHeader
                    kicker={t.dashboard.settings.kicker}
                    title={t.dashboard.settings.title}
                    description={t.dashboard.settings.description}
                />

                <DashboardPanel
                    title={t.dashboard.settings.panel.title}
                    description={t.dashboard.settings.panel.description}
                >
                    {verifyMessage ? (
                        <div
                            className={`mb-4 rounded-box border px-4 py-3 text-sm ${
                                verifyMessage.type === "success"
                                    ? "border-success/20 bg-success/10 text-success"
                                    : "border-error/20 bg-error/10 text-error"
                            }`}
                        >
                            {verifyMessage.text}
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.92fr_1.08fr]">
                        <div className="rounded-box border border-base-300 bg-base-200/40 p-5 shadow-sm">
                            <div className="space-y-3">
                                <div className="border-b border-base-300 pb-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">{t.dashboard.settings.account.username}</div>
                                    <div className="mt-2 text-sm font-semibold text-base-content">
                                        {meLoading ? t.dashboard.settings.account.loading : me ? `@${me.username}` : t.dashboard.settings.account.unavailable}
                                    </div>
                                </div>

                                <div className="border-b border-base-300 pb-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">{t.dashboard.settings.account.email}</div>
                                    <div className="mt-2 text-sm font-medium text-base-content">
                                        {meLoading ? t.dashboard.settings.account.loading : me?.email || t.dashboard.settings.account.emailUnavailable}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">{t.dashboard.settings.account.verification}</div>
                                    <div className="mt-2 flex flex-wrap items-center gap-3">
                                        <span
                                            className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                                                me?.emailVerified
                                                    ? "border-success/25 bg-success/10 text-success"
                                                    : "border-warning/25 bg-warning/10 text-warning"
                                            }`}
                                        >
                                            {meLoading ? t.dashboard.settings.account.loading : me?.emailVerified ? t.dashboard.settings.verification.verified : t.dashboard.settings.verification.unverified}
                                        </span>
                                        {!meLoading && me && !me.emailVerified ? (
                                            <button onClick={handleResendVerification} disabled={verifyLoading} className={btnOutline}>
                                                {verifyLoading ? t.dashboard.settings.verification.resending : t.dashboard.settings.verification.resend}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-box border border-base-300 bg-base-200/40 p-5 shadow-sm">
                            <div className="mb-4">
                                <div className="text-sm font-semibold text-base-content">{t.dashboard.settings.password.title}</div>
                                <p className="mt-1 text-sm text-base-content/60">
                                    {t.dashboard.settings.password.description}
                                </p>
                            </div>

                            {meLoading ? (
                                <p className="text-sm text-base-content/60">{t.dashboard.settings.loadingAccount}</p>
                            ) : !me ? (
                                <p className="text-sm text-error">{t.dashboard.settings.loadAccountFailed}</p>
                            ) : (
                                <>
                                    {error ? (
                                        <div className="mb-4 rounded-box border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
                                            {error}
                                        </div>
                                    ) : null}
                                    {successMessage ? (
                                        <div className="mb-4 rounded-box border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
                                            {successMessage}
                                        </div>
                                    ) : null}

                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <div>
                                            <label className={labelCls}>{t.dashboard.settings.password.currentLabel}</label>
                                            <input
                                                type="password"
                                                className={inputCls}
                                                placeholder={t.dashboard.settings.password.currentPlaceholder}
                                                value={form.currentPassword}
                                                onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t.dashboard.settings.password.newLabel}</label>
                                            <input
                                                type="password"
                                                className={inputCls}
                                                placeholder={t.dashboard.settings.password.newPlaceholder}
                                                value={form.newPassword}
                                                onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t.dashboard.settings.password.confirmLabel}</label>
                                            <input
                                                type="password"
                                                className={inputCls}
                                                placeholder={t.dashboard.settings.password.confirmPlaceholder}
                                                value={form.confirmPassword}
                                                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <button type="submit" disabled={loading} className={btnPrimary}>
                                                {loading ? t.dashboard.settings.password.saving : t.dashboard.settings.password.save}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    await clientLogout("/login");
                                                }}
                                                className={btnDanger}
                                            >
                                                {t.dashboard.settings.password.logout}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </DashboardPanel>
            </div>
        </DashboardPageShell>
    );
}


