interface StatCardProps {
    label: string;
    value: string | number;
    icon: string;
    change?: string;
    changeType?: "positive" | "negative";
    primary?: boolean;
}

export function StatCard({
    label,
    value,
    icon,
    change,
    changeType = "positive",
    primary = false,
}: StatCardProps) {
    return (
        <div
            className={`rounded-2xl border p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-5 ${
                primary
                    ? "border-ds-amber/30 bg-ds-amber text-black"
                    : "border-black/5 bg-white/85 dark:border-white/6 dark:bg-white/[0.04]"
            }`}
        >
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <div
                        className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
                            primary ? "text-black/55" : "text-slate-400 dark:text-white/35"
                        }`}
                    >
                        {label}
                    </div>
                    <div
                        className={`mt-3 text-3xl font-black tracking-tight ${
                            primary ? "text-black" : "text-slate-950 dark:text-white"
                        }`}
                    >
                        {value}
                    </div>
                </div>
                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold ${
                        primary
                            ? "bg-black/10 text-black"
                            : "bg-slate-100 text-slate-500 dark:bg-white/8 dark:text-white/55"
                    }`}
                >
                    {icon}
                </div>
            </div>
            {change ? (
                <div
                    className={`text-sm ${
                        primary
                            ? "text-black/60"
                            : changeType === "negative"
                              ? "text-red-500"
                              : "text-emerald-500"
                    }`}
                >
                    {change}
                </div>
            ) : null}
        </div>
    );
}
