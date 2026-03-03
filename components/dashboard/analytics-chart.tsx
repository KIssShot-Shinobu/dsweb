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
        <div className="card">
            <div className="card-header">
                <span className="card-title">Weekly Activity</span>
            </div>
            <div className="card-body">
                <div className="chart-container">
                    {chartData.map((item, index) => (
                        <div key={index} className="chart-bar-group">
                            <div
                                className="chart-bar"
                                style={{
                                    height: `${(item.value / maxValue) * 160}px`,
                                }}
                            />
                            <span className="chart-label">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
