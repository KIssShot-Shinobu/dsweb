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
        <div className={`card border shadow-sm transition-transform duration-200 hover:-translate-y-0.5 ${primary ? "border-primary/30 bg-primary text-primary-content" : "border-base-300 bg-base-100"}`}>
            <div className="card-body p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <div className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${primary ? "text-primary-content/65" : "text-base-content/50"}`}>
                            {label}
                        </div>
                        <div className={`mt-3 text-3xl font-black tracking-tight ${primary ? "text-primary-content" : "text-base-content"}`}>
                            {value}
                        </div>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold ${primary ? "bg-primary-content/10 text-primary-content" : "bg-base-200 text-base-content/65"}`}>
                        {icon}
                    </div>
                </div>
                {change ? (
                    <div className={`text-sm ${primary ? "text-primary-content/70" : changeType === "negative" ? "text-error" : "text-success"}`}>
                        {change}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
