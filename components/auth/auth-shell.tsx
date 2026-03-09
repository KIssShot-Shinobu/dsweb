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
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] shadow-[0_32px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:rounded-[36px]">
            <div className="grid min-h-[680px] lg:grid-cols-[1.08fr_0.92fr]">
                <section className="relative hidden overflow-hidden lg:flex">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),transparent_36%),linear-gradient(180deg,rgba(21,45,68,0.34)_0%,rgba(10,14,20,0.55)_100%),linear-gradient(135deg,#20384f_0%,#304e66_30%,#4f546d_58%,#6f6570_78%,#262320_100%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_16%,rgba(255,255,255,0.14),transparent_18%),radial-gradient(circle_at_18%_78%,rgba(0,0,0,0.22),transparent_28%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,transparent_0%,rgba(20,12,8,0.24)_18%,rgba(53,34,25,0.7)_100%)]" />
                    <div className="relative z-10 flex min-h-full flex-col justify-between p-10 xl:p-12">
                        <div>
                            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-white/75">{eyebrow}</div>
                        </div>

                        <div className="max-w-md space-y-5 text-white">
                            <div className="space-y-2">
                                <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">Duel Standby</p>
                                <h1 className="text-5xl font-black uppercase leading-[0.92] tracking-tight xl:text-6xl">{title}</h1>
                            </div>
                            <p className="max-w-sm text-base leading-7 text-white/78 xl:text-lg">{description}</p>
                            <div className="pt-2 text-sm uppercase tracking-[0.24em] text-white/55">Public tournament. Guild roster. Satu akun.</div>
                        </div>
                    </div>
                </section>

                <section className="flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
                    <div className="w-full max-w-[460px] rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_100%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:rounded-[32px] sm:p-7">
                        <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
                            <div>
                                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ds-amber text-lg font-black text-black shadow-[0_12px_30px_rgba(245,185,66,0.3)] sm:h-12 sm:w-12">
                                    DS
                                </div>
                                <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/48 lg:hidden">{eyebrow}</div>
                                <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-[2rem] lg:text-[1.9rem]">{title}</h2>
                                <p className="mt-2 max-w-sm text-sm leading-6 text-white/62">{description}</p>
                            </div>
                            <Link href="/" className="inline-flex rounded-2xl border border-white/10 px-3 py-2 text-xs font-medium text-white/68 transition-all hover:bg-white/6 hover:text-white sm:text-sm">
                                Home
                            </Link>
                        </div>

                        {children}

                        {footer ? <div className="mt-5 border-t border-white/10 pt-4 text-center text-sm text-white/48 sm:mt-6 sm:pt-5">{footer}</div> : null}
                    </div>
                </section>
            </div>
        </div>
    );
}

export const authInputCls =
    "w-full rounded-2xl border border-white/10 bg-white/90 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-ds-amber focus:ring-4 focus:ring-ds-amber/15 sm:py-3";

export const authLabelCls =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/62";

export const authPrimaryBtnCls =
    "inline-flex w-full items-center justify-center rounded-2xl bg-ds-amber px-4 py-3 text-sm font-bold text-black transition-all hover:-translate-y-0.5 hover:bg-ds-gold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[170px]";

export const authSecondaryBtnCls =
    "inline-flex w-full items-center justify-center rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-medium text-white/78 transition-all hover:bg-white/10 hover:text-white sm:w-auto";

export const authAlertCls =
    "rounded-2xl border px-4 py-3 text-sm";
