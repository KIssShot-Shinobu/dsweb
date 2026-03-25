"use client";

import Link from "next/link";
import { AuthShell, authPrimaryBtnCls } from "@/components/auth/auth-shell";
import { useLocale } from "@/hooks/use-locale";

export default function RegisterSuccessPage() {
    const { t } = useLocale();
    return (
        <AuthShell
            eyebrow={t.auth.registerSuccess.eyebrow}
            title={t.auth.registerSuccess.title}
            description={t.auth.registerSuccess.description}
            footer={
                <Link href="/" className="font-semibold text-ds-amber transition-colors hover:text-ds-gold">
                    {t.auth.registerSuccess.backHome}
                </Link>
            }
        >
            <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/15 text-3xl font-black text-emerald-400">
                    OK
                </div>
                <h3 className="mt-5 text-2xl font-black tracking-tight text-white">{t.auth.registerSuccess.cardTitle}</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/55">
                    {t.auth.registerSuccess.cardBody}
                </p>
                <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-black/10 px-4 py-3 text-sm font-medium text-emerald-300">
                    {t.auth.registerSuccess.accountStatus}
                </div>
                <div className="mt-6">
                    <Link href="/login" className={authPrimaryBtnCls}>
                        {t.auth.registerSuccess.loginNow}
                    </Link>
                </div>
            </div>
        </AuthShell>
    );
}
