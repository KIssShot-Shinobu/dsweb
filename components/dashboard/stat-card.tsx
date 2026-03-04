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
        <div className={`rounded-2xl p-5 border ${primary
                ? "bg-ds-amber border-ds-amber text-black"
                : "bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-white/5"
            }`}>
            <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wider ${primary ? "text-black/60" : "text-gray-400 dark:text-white/40"
                    }`}>
                    {label}
                </span>
                <div className="text-xl">{icon}</div>
            </div>
            <div className={`text-3xl font-bold mb-1.5 ${primary ? "text-black" : "text-gray-900 dark:text-white"
                }`}>
                {value}
            </div>
            {change && (
                <div className={`text-xs font-medium ${primary
                        ? "text-black/50"
                        : changeType === "negative"
                            ? "text-red-500"
                            : "text-emerald-500"
                    }`}>
                    {changeType === "positive" ? "↑" : "↓"} {change}
                </div>
            )}
        </div>
    );
}
