import Image from "next/image";
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
            <section className="card border border-base-300/70 bg-base-100/92 shadow-2xl backdrop-blur-xl">
                <div className="card-body p-4 sm:p-6">
                    <div className="mb-5 text-center sm:mb-6">
                        <div className="badge badge-primary mx-auto h-11 w-11 rounded-2xl border-0 p-0 shadow-lg sm:h-12 sm:w-12">
                            <Image
                                src="/logods.jpg"
                                alt="Duel Standby"
                                width={48}
                                height={48}
                                className="h-full w-full rounded-2xl object-cover"
                            />
                        </div>
                        <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-base-content/45 sm:text-[11px]">{eyebrow}</div>
                        <h1 className="mt-2 text-2xl font-black tracking-tight text-base-content sm:text-[2rem]">{title}</h1>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-base-content/60">{description}</p>
                    </div>

                    {children}

                    {footer ? <div className="mt-5 border-t border-base-300/70 pt-4 text-center text-sm text-base-content/55 sm:mt-6 sm:pt-5">{footer}</div> : null}
                </div>
            </section>
        </div>
    );
}

export const authInputCls =
    "input input-bordered w-full bg-base-100";

export const authLabelCls =
    "label pb-2 pt-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/60";

export const authPrimaryBtnCls =
    "btn btn-primary w-full rounded-box";

export const authSecondaryBtnCls =
    "btn btn-outline w-full rounded-box";

export const authAlertCls =
    "alert rounded-box text-sm";
