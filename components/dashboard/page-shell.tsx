import Link from "next/link";
import type { ReactNode } from "react";
import {
    btnOutline,
    heroDescriptionCls,
    heroKickerCls,
    heroTitleCls,
    metricCardCls,
    metricMetaCls,
    metricValueCls,
    pageHeaderCls,
    panelBodyCls,
    panelCls,
    panelHeaderCls,
    shellCls,
    subtleMetricCls,
} from "@/components/dashboard/form-styles";

export function DashboardPageShell({ children }: { children: ReactNode }) {
    return <div className={shellCls}>{children}</div>;
}

export function DashboardPageHeader({
    kicker,
    title,
    description,
    actions,
}: {
    kicker?: string;
    title: string;
    description: string;
    actions?: ReactNode;
}) {
    return (
        <section className={pageHeaderCls}>
            <div className="min-w-0 space-y-2">
                {kicker ? <div className={heroKickerCls}>{kicker}</div> : null}
                <div className={heroTitleCls}>{title}</div>
                <p className={heroDescriptionCls}>{description}</p>
            </div>
            {actions ? <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">{actions}</div> : null}
        </section>
    );
}

export function DashboardPanel({
    title,
    description,
    action,
    children,
    bodyClassName = "",
}: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    bodyClassName?: string;
}) {
    return (
        <section className={`${panelCls} overflow-visible`}>
            <div className={panelHeaderCls}>
                <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-950 dark:text-white sm:text-lg">{title}</h2>
                    {description ? <p className="text-sm text-slate-500 dark:text-white/45">{description}</p> : null}
                </div>
                {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
            </div>
            <div className={`${panelBodyCls} overflow-visible ${bodyClassName}`.trim()}>{children}</div>
        </section>
    );
}

export function DashboardMetricCard({
    label,
    value,
    meta,
    tone = "default",
}: {
    label: string;
    value: ReactNode;
    meta?: string;
    tone?: "default" | "accent" | "success" | "danger";
}) {
    const toneClass =
        tone === "accent"
            ? "border-ds-amber/30 bg-ds-amber/[0.14] dark:bg-ds-amber/10"
            : tone === "success"
              ? "border-emerald-500/20 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.10]"
              : tone === "danger"
                ? "border-red-500/20 bg-red-500/[0.07] dark:bg-red-500/[0.10]"
                : "";

    return (
        <div className={`${metricCardCls} ${toneClass}`.trim()}>
            <div className={subtleMetricCls}>{label}</div>
            <div className={metricValueCls}>{value}</div>
            {meta ? <div className={metricMetaCls}>{meta}</div> : null}
        </div>
    );
}

export function DashboardEmptyState({
    title,
    description,
    actionHref,
    actionLabel,
}: {
    title: string;
    description: string;
    actionHref?: string;
    actionLabel?: string;
}) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/80 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-base font-semibold text-slate-950 dark:text-white">{title}</div>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-white/45">{description}</p>
            {actionHref && actionLabel ? (
                <div className="mt-5">
                    <Link href={actionHref} className={btnOutline}>
                        {actionLabel}
                    </Link>
                </div>
            ) : null}
        </div>
    );
}
