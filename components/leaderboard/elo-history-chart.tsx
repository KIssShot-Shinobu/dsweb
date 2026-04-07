"use client";

type EloHistoryChartProps = {
    values: number[];
    emptyLabel: string;
};

export function EloHistoryChart({ values, emptyLabel }: EloHistoryChartProps) {
    if (values.length < 2) {
        return (
            <div className="flex h-32 items-center justify-center rounded-box border border-base-300 bg-base-200/40 text-xs text-base-content/50">
                {emptyLabel}
            </div>
        );
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
    });

    return (
        <div className="h-32 rounded-box border border-base-300 bg-base-100 p-3">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                <polyline
                    points={points.join(" ")}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-primary"
                />
            </svg>
        </div>
    );
}
