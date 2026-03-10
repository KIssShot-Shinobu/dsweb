import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
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
    return <div className={cn(shellCls, "p-4 sm:p-5 lg:p-6")}>{children}</div>;
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
            <div className="card-body gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 space-y-2">
                    {kicker ? <div className={heroKickerCls}>{kicker}</div> : null}
                    <div className={heroTitleCls}>{title}</div>
                    <p className={heroDescriptionCls}>{description}</p>
                </div>
                {actions ? <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">{actions}</div> : null}
            </div>
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
        <section className={cn(panelCls, "overflow-visible")}>
            <div className={panelHeaderCls}>
                <div className="space-y-1">
                    <h2 className="text-base font-bold text-base-content sm:text-lg">{title}</h2>
                    {description ? <p className="text-sm text-base-content/60">{description}</p> : null}
                </div>
                {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
            </div>
            <div className={cn(panelBodyCls, "overflow-visible", bodyClassName)}>{children}</div>
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
            ? "border-primary/30 bg-primary/10"
            : tone === "success"
              ? "border-success/30 bg-success/10"
              : tone === "danger"
                ? "border-error/30 bg-error/10"
                : "";

    return (
        <div className={cn(metricCardCls, toneClass)}>
            <div className="card-body p-4 sm:p-5">
                <div className={subtleMetricCls}>{label}</div>
                <div className={metricValueCls}>{value}</div>
                {meta ? <div className={metricMetaCls}>{meta}</div> : null}
            </div>
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
        <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-6 py-12 text-center">
            <div className="text-base font-semibold text-base-content">{title}</div>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-base-content/60">{description}</p>
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
