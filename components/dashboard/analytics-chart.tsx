"use client";

const chartData = [
    { label: "S", value: 40 },
    { label: "M", value: 65 },
    { label: "T", value: 78 },
    { label: "W", value: 52 },
    { label: "T", value: 85 },
    { label: "F", value: 70 },
    { label: "S", value: 45 },
];

export function AnalyticsChart() {
    const maxValue = Math.max(...chartData.map((d) => d.value));

    return (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                <span className="text-base font-semibold text-gray-900 dark:text-white">Weekly Activity</span>
            </div>
            <div className="p-5">
                <div className="flex items-end justify-between gap-2 h-40">
                    {chartData.map((item, index) => (
                        <div key={index} className="flex flex-col items-center gap-2 flex-1">
                            <div
                                className="w-full rounded-lg bg-ds-amber/20 dark:bg-ds-amber/10 hover:bg-ds-amber/40 transition-colors cursor-default"
                                style={{ height: `${(item.value / maxValue) * 140}px` }}
                            />
                            <span className="text-[11px] font-medium text-gray-400 dark:text-white/30">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
