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
        <div className={`stat-card ${primary ? "primary" : ""}`}>
            <div className="stat-card-header">
                <span className="stat-label">{label}</span>
                <div className="stat-icon">{icon}</div>
            </div>
            <div className="stat-value">{value}</div>
            {change && (
                <div className={`stat-change ${changeType === "negative" ? "negative" : ""}`}>
                    {changeType === "positive" ? "↑" : "↓"} {change}
                </div>
            )}
        </div>
    );
}
