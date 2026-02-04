import React, { useEffect, useState } from 'react';

/**
 * ProgressRing - Circular progress indicator
 */
export const ProgressRing = ({
    value = 0,
    max = 100,
    size = 80,
    strokeWidth = 8,
    color = '#6366f1',
    trackColor = '#e2e8f0',
    showValue = true,
    showLabel = false,
    label = '',
    valueFormat = 'percent', // 'percent' | 'number' | 'currency'
    animated = true,
    className = ''
}) => {
    const [animatedValue, setAnimatedValue] = useState(0);

    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (animatedValue / 100) * circumference;
    const center = size / 2;

    // Animate the progress
    useEffect(() => {
        if (!animated) {
            setAnimatedValue(percentage);
            return;
        }

        const duration = 1000;
        const steps = 30;
        const stepDuration = duration / steps;
        const increment = percentage / steps;
        let current = 0;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            current += increment;
            if (step >= steps) {
                setAnimatedValue(percentage);
                clearInterval(timer);
            } else {
                setAnimatedValue(current);
            }
        }, stepDuration);

        return () => clearInterval(timer);
    }, [percentage, animated]);

    const formatDisplayValue = () => {
        if (valueFormat === 'percent') return `${Math.round(animatedValue)}%`;
        if (valueFormat === 'currency') return `S/ ${value.toLocaleString()}`;
        return value.toLocaleString();
    };

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Track (background circle) */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 ease-out"
                />
            </svg>
            {/* Center content */}
            {(showValue || showLabel) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {showValue && (
                        <span className="text-sm font-bold text-slate-700">
                            {formatDisplayValue()}
                        </span>
                    )}
                    {showLabel && label && (
                        <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                            {label}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * MultiProgressRing - Ring with multiple segments
 */
export const MultiProgressRing = ({
    segments = [], // [{ value, color, label }]
    size = 80,
    strokeWidth = 8,
    trackColor = '#e2e8f0',
    showLegend = true,
    className = ''
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const center = size / 2;

    const total = segments.reduce((sum, s) => sum + s.value, 0);
    let accumulated = 0;

    return (
        <div className={`${className}`}>
            <div className="relative inline-flex items-center justify-center">
                <svg width={size} height={size} className="transform -rotate-90">
                    {/* Track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={trackColor}
                        strokeWidth={strokeWidth}
                    />
                    {/* Segments */}
                    {segments.map((segment, idx) => {
                        const segmentPercentage = total > 0 ? (segment.value / total) * 100 : 0;
                        const offset = (accumulated / 100) * circumference;
                        accumulated += segmentPercentage;
                        const dashLength = (segmentPercentage / 100) * circumference;

                        return (
                            <circle
                                key={idx}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                strokeDasharray={`${dashLength} ${circumference}`}
                                strokeDashoffset={-offset}
                                className="transition-all duration-500"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-700">
                        {total.toLocaleString()}
                    </span>
                    <span className="text-[8px] text-slate-400">TOTAL</span>
                </div>
            </div>
            {showLegend && (
                <div className="mt-2 flex flex-wrap gap-2 justify-center">
                    {segments.map((segment, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[10px]">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: segment.color }}
                            />
                            <span className="text-slate-500">{segment.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProgressRing;
