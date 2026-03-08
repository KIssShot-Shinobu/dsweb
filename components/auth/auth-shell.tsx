import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
    eyebrow = "Duel Standby",
    title,
    description,
    children,
    footer,
}: {
    eyebrow?: string;
    title: string;
    description: string;
    children: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <div className="mx-auto w-full max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <section className="hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur lg:block xl:p-10">
                    <div className="inline-flex items-center gap-3 rounded-full border border-ds-amber/20 bg-ds-amber/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-ds-amber">
                        {eyebrow}
                    </div>
                    <h1 className="mt-6 max-w-lg text-4xl font-black leading-tight text-white xl:text-5xl">{title}</h1>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-white/55 xl:text-base">{description}</p>

                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                        {[
                            { label: "Public First", value: "Akun publik aktif bisa langsung dibuat tanpa menunggu approval terpisah." },
                            { label: "Role Terpisah", value: "Role komunitas, akses dashboard, dan afiliasi team dipisah dengan jelas." },
                            { label: "Safe Upload", value: "Upload publik sementara akan di-claim otomatis saat registrasi berhasil." },
                        ].map((item) => (
                            <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ds-amber/90">{item.label}</div>
                                <p className="mt-2 text-sm leading-6 text-white/50">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.04)_100%)] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur sm:p-6 xl:p-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ds-amber">
                                <span className="text-lg font-black text-black">DS</span>
                            </div>
                            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.26em] text-ds-amber/90 lg:hidden">{eyebrow}</div>
                            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">{title}</h2>
                            <p className="mt-2 text-sm leading-6 text-white/50">{description}</p>
                        </div>
                        <Link href="/" className="hidden rounded-2xl border border-white/10 px-3.5 py-2 text-sm font-medium text-white/60 transition-all hover:bg-white/5 hover:text-white sm:inline-flex">
                            Home
                        </Link>
                    </div>

                    {children}

                    {footer ? <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-white/40">{footer}</div> : null}
                </section>
            </div>
        </div>
    );
}

export const authInputCls =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-ds-amber focus:ring-4 focus:ring-ds-amber/15";

export const authLabelCls =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45";

export const authPrimaryBtnCls =
    "inline-flex w-full items-center justify-center rounded-2xl bg-ds-amber px-4 py-3 text-sm font-bold text-black transition-all hover:-translate-y-0.5 hover:bg-ds-gold disabled:cursor-not-allowed disabled:opacity-50";

export const authSecondaryBtnCls =
    "inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/65 transition-all hover:bg-white/5 hover:text-white";

export const authAlertCls =
    "rounded-2xl border px-4 py-3 text-sm";
