import React, { useEffect, useState } from 'react';
import { Icons } from './Icons';

/**
 * TrendBadge - Animated badge showing percentage change
 */
export const TrendBadge = ({
    value = 0,
    suffix = '%',
    showIcon = true,
    size = 'md', // 'sm' | 'md' | 'lg'
    animated = true,
    className = ''
}) => {
    const [displayValue, setDisplayValue] = useState(0);

    const isPositive = value >= 0;
    const isNeutral = value === 0;

    // Animate counting effect
    useEffect(() => {
        if (!animated) {
            setDisplayValue(value);
            return;
        }

        const duration = 800;
        const steps = 20;
        const stepDuration = duration / steps;
        const increment = value / steps;
        let current = 0;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            current += increment;
            if (step >= steps) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(current);
            }
        }, stepDuration);

        return () => clearInterval(timer);
    }, [value, animated]);

    const sizeClasses = {
        sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
        md: 'text-xs px-2 py-1 gap-1',
        lg: 'text-sm px-2.5 py-1.5 gap-1'
    };

    const iconSizes = { sm: 10, md: 12, lg: 14 };

    const colorClasses = isNeutral
        ? 'bg-slate-100 text-slate-500'
        : isPositive
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
            : 'bg-red-50 text-red-600 border-red-100';

    const Icon = isPositive ? Icons.TrendingUp : Icons.TrendingDown;

    return (
        <span className={`
            inline-flex items-center font-bold rounded-full border
            ${sizeClasses[size]}
            ${colorClasses}
            ${className}
        `}>
            {showIcon && !isNeutral && (
                <Icon
                    size={iconSizes[size]}
                    className={`${animated ? 'animate-pulse' : ''}`}
                />
            )}
            <span>
                {isPositive && !isNeutral ? '+' : ''}
                {displayValue.toFixed(1)}{suffix}
            </span>
        </span>
    );
};

/**
 * TrendIndicator - Simple arrow indicator
 */
export const TrendIndicator = ({
    value = 0,
    size = 16,
    className = ''
}) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? Icons.ArrowUp : Icons.ArrowDown;
    const colorClass = isPositive ? 'text-emerald-500' : 'text-red-500';

    return (
        <span className={`inline-flex items-center ${colorClass} ${className}`}>
            <Icon size={size} />
        </span>
    );
};

/**
 * ComparisonBadge - Shows comparison with previous period
 */
export const ComparisonBadge = ({
    current = 0,
    previous = 0,
    label = 'vs mes anterior',
    format = 'currency', // 'currency' | 'number' | 'percent'
    className = ''
}) => {
    const diff = current - previous;
    const percentChange = previous !== 0 ? ((diff / previous) * 100) : 0;
    const isPositive = diff >= 0;

    const formatValue = (val) => {
        if (format === 'currency') return `S/ ${val.toLocaleString()}`;
        if (format === 'percent') return `${val.toFixed(1)}%`;
        return val.toLocaleString();
    };

    return (
        <div className={`flex items-center gap-2 text-xs ${className}`}>
            <TrendBadge value={percentChange} size="sm" />
            <span className="text-slate-400">{label}</span>
        </div>
    );
};

export default TrendBadge;
