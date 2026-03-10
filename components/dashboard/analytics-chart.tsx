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
    const maxValue = data.length > 0 ? Math.max(...data.flatMap((item) => [item.income, item.expense]), 1) : 1;

    if (loading) {
        return (
            <div className="card border border-base-300 bg-base-100 shadow-md">
                <div className="card-body p-0">
                    <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
                        <span className="text-base font-semibold text-base-content">Weekly Treasury</span>
                    </div>
                    <div className="p-5">
                        <div className="flex h-40 items-end justify-between gap-2">
                            {Array.from({ length: 7 }).map((_, index) => (
                                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                                    <div className="flex h-[120px] w-full items-end gap-1">
                                        <div className="skeleton min-h-[12px] flex-1 rounded-t-md" />
                                        <div className="skeleton min-h-[16px] flex-1 rounded-t-md" />
                                    </div>
                                    <div className="skeleton h-3 w-6 rounded-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="card border border-base-300 bg-base-100 shadow-md">
                <div className="card-body p-0">
                    <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
                        <span className="text-base font-semibold text-base-content">Weekly Treasury</span>
                    </div>
                    <div className="flex h-40 items-center justify-center p-5 text-sm text-base-content/45">
                        No transaction data
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card border border-base-300 bg-base-100 shadow-md">
            <div className="card-body p-0">
                <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
                    <span className="text-base font-semibold text-base-content">Weekly Treasury</span>
                    <div className="flex items-center gap-4 text-xs text-base-content/45">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
                            Income
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-error" />
                            Expense
                        </span>
                    </div>
                </div>
                <div className="p-5">
                    <div className="flex h-40 items-end justify-between gap-2">
                        {data.map((item, index) => (
                            <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
                                <div className="flex w-full items-end gap-0.5" style={{ height: "120px" }}>
                                    <div
                                        className="flex-1 rounded-t-md bg-success/35 transition-colors hover:bg-success/55"
                                        style={{ height: `${(item.income / maxValue) * 100}%`, minHeight: item.income > 0 ? "4px" : "0" }}
                                        title={`Income: ${item.income}`}
                                    />
                                    <div
                                        className="flex-1 rounded-t-md bg-error/35 transition-colors hover:bg-error/55"
                                        style={{ height: `${(item.expense / maxValue) * 100}%`, minHeight: item.expense > 0 ? "4px" : "0" }}
                                        title={`Expense: ${item.expense}`}
                                    />
                                </div>
                                <span className="text-[11px] font-medium text-base-content/45">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
