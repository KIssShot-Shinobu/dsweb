"use client";

interface ChartItem {
    label: string;
    income: number;
    expense: number;
}

interface AnalyticsChartProps {
    data?: ChartItem[];
    loading?: boolean;
}

export function AnalyticsChart({ data = [], loading = false }: AnalyticsChartProps) {
    const maxValue = data.length > 0
        ? Math.max(...data.flatMap((d) => [d.income, d.expense]), 1)
        : 1;

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#1a1a1a]">
                <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/5">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Weekly Treasury</span>
                </div>
                <div className="p-5">
                    <div className="flex h-40 items-end justify-between gap-2">
                        {Array.from({ length: 7 }).map((_, index) => (
                            <div key={index} className="flex flex-1 flex-col items-center gap-2">
                                <div className="flex h-[120px] w-full items-end gap-1">
                                    <div className="min-h-[12px] flex-1 animate-pulse rounded-t-md bg-gray-100 dark:bg-white/5" />
                                    <div className="min-h-[16px] flex-1 animate-pulse rounded-t-md bg-gray-100 dark:bg-white/5" />
                                </div>
                                <div className="h-3 w-6 animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Weekly Treasury</span>
                </div>
                <div className="p-5 flex items-center justify-center h-40 text-sm text-gray-400 dark:text-white/30">
                    No transaction data
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                <span className="text-base font-semibold text-gray-900 dark:text-white">Weekly Treasury</span>
                <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-white/30">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Income
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                        Expense
                    </span>
                </div>
            </div>
            <div className="p-5">
                <div className="flex items-end justify-between gap-2 h-40">
                    {data.map((item, index) => (
                        <div key={index} className="flex flex-col items-center gap-1.5 flex-1">
                            <div className="w-full flex gap-0.5 items-end" style={{ height: "120px" }}>
                                {/* Income bar */}
                                <div
                                    className="flex-1 rounded-t-md bg-emerald-500/30 hover:bg-emerald-500/50 transition-colors"
                                    style={{ height: `${(item.income / maxValue) * 100}%`, minHeight: item.income > 0 ? "4px" : "0" }}
                                    title={`Income: ${item.income}`}
                                />
                                {/* Expense bar */}
                                <div
                                    className="flex-1 rounded-t-md bg-red-400/30 hover:bg-red-400/50 transition-colors"
                                    style={{ height: `${(item.expense / maxValue) * 100}%`, minHeight: item.expense > 0 ? "4px" : "0" }}
                                    title={`Expense: ${item.expense}`}
                                />
                            </div>
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
