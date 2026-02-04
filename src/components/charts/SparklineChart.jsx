import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

/**
 * SparklineChart - Compact inline chart for KPI cards
 */
export const SparklineChart = ({
    data = [],
    dataKey = 'value',
    color = '#6366f1',
    height = 40,
    width = '100%',
    showTooltip = true,
    gradientId,
    className = ''
}) => {
    // Generate unique gradient ID if not provided
    const uniqueId = gradientId || `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

    // Determine if trend is positive
    const isPositive = data.length >= 2 && data[data.length - 1][dataKey] >= data[0][dataKey];
    const fillColor = color || (isPositive ? '#10b981' : '#ef4444');

    if (!data || data.length === 0) {
        return (
            <div className={`h-[${height}px] w-full flex items-center justify-center ${className}`}>
                <div className="text-[10px] text-slate-400">Sin datos</div>
            </div>
        );
    }

    return (
        <div className={`${className}`} style={{ height, width }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                        <linearGradient id={uniqueId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    {showTooltip && (
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '11px',
                                color: '#fff',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)'
                            }}
                            formatter={(value) => [`S/ ${value.toLocaleString()}`, '']}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.label || label}
                        />
                    )}
                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={fillColor}
                        strokeWidth={2}
                        fill={`url(#${uniqueId})`}
                        dot={false}
                        activeDot={{ r: 3, fill: fillColor, stroke: '#fff', strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

/**
 * SparklineBar - Simple bar sparkline
 */
export const SparklineBar = ({
    data = [],
    dataKey = 'value',
    color = '#6366f1',
    height = 30,
    className = ''
}) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data.map(d => d[dataKey] || 0));

    return (
        <div className={`flex items-end gap-0.5 ${className}`} style={{ height }}>
            {data.map((item, i) => {
                const value = item[dataKey] || 0;
                const heightPercent = max > 0 ? (value / max) * 100 : 0;
                return (
                    <div
                        key={i}
                        className="flex-1 rounded-t transition-all duration-300"
                        style={{
                            height: `${Math.max(heightPercent, 5)}%`,
                            backgroundColor: color,
                            opacity: 0.4 + (i / data.length) * 0.6
                        }}
                        title={`${item.label || ''}: ${value}`}
                    />
                );
            })}
        </div>
    );
};

export default SparklineChart;
