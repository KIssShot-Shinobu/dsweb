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
        <div className="mx-auto w-full max-w-[560px]">
            <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_100%)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:rounded-[32px] sm:p-6">
                <div className="mb-5 text-center sm:mb-6">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ds-amber text-base font-black text-black shadow-[0_12px_30px_rgba(245,185,66,0.28)] sm:h-12 sm:w-12 sm:text-lg">
                        DS
                    </div>
                    <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45 sm:text-[11px]">{eyebrow}</div>
                    <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-[2rem]">{title}</h1>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/58">{description}</p>
                </div>

                {children}

                {footer ? <div className="mt-5 border-t border-white/10 pt-4 text-center text-sm text-white/48 sm:mt-6 sm:pt-5">{footer}</div> : null}
            </section>
        </div>
    );
}

export const authInputCls =
    "w-full rounded-2xl border border-white/10 bg-white/92 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-ds-amber focus:ring-4 focus:ring-ds-amber/15";

export const authLabelCls =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60";

export const authPrimaryBtnCls =
    "inline-flex w-full items-center justify-center rounded-2xl bg-ds-amber px-4 py-3 text-sm font-bold text-black transition-all hover:-translate-y-0.5 hover:bg-ds-gold disabled:cursor-not-allowed disabled:opacity-50";

export const authSecondaryBtnCls =
    "inline-flex w-full items-center justify-center rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-white/78 transition-all hover:bg-white/10 hover:text-white";

export const authAlertCls =
    "rounded-2xl border px-4 py-3 text-sm";
