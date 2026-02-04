import React from 'react';
import { SparklineChart } from '../charts/SparklineChart';
import { TrendBadge } from './TrendBadge';
import { ProgressRing } from './ProgressRing';
import { Icons } from './Icons';

/**
 * KPICard - Enhanced Key Performance Indicator card
 * Supports sparklines, trends, and progress rings
 */
export const KPICard = ({
    title,
    value,
    valuePrefix = '',
    valueSuffix = '',
    subtitle = '',
    icon: Icon,
    iconColor = 'bg-indigo-500',
    trend = null, // { value: number, label?: string }
    sparklineData = null, // [{ value, label? }]
    progress = null, // { value, max, color? }
    variant = 'default', // 'default' | 'accent' | 'success' | 'warning'
    size = 'md', // 'sm' | 'md' | 'lg'
    className = ''
}) => {
    const variantStyles = {
        default: 'bg-white border-slate-100',
        accent: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-indigo-400',
        success: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400',
        warning: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-400'
    };

    const textStyles = {
        default: {
            title: 'text-slate-500',
            value: 'text-slate-800',
            subtitle: 'text-slate-400',
            icon: iconColor
        },
        accent: {
            title: 'text-indigo-100',
            value: 'text-white',
            subtitle: 'text-indigo-200',
            icon: 'bg-white/20'
        },
        success: {
            title: 'text-emerald-100',
            value: 'text-white',
            subtitle: 'text-emerald-200',
            icon: 'bg-white/20'
        },
        warning: {
            title: 'text-amber-100',
            value: 'text-white',
            subtitle: 'text-amber-200',
            icon: 'bg-white/20'
        }
    };

    const sizeStyles = {
        sm: { padding: 'p-4', title: 'text-xs', value: 'text-xl', icon: 36 },
        md: { padding: 'p-5', title: 'text-xs', value: 'text-2xl', icon: 44 },
        lg: { padding: 'p-6', title: 'text-sm', value: 'text-3xl', icon: 52 }
    };

    const styles = textStyles[variant];
    const sizes = sizeStyles[size];
    const isLight = variant !== 'default';

    return (
        <div className={`
            relative overflow-hidden rounded-2xl border shadow-sm
            ${variantStyles[variant]}
            ${sizes.padding}
            transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5
            ${className}
        `}>
            {/* Top Section - Icon and Trend */}
            <div className="flex justify-between items-start mb-4">
                {Icon && (
                    <div className={`
                        ${styles.icon} 
                        p-2.5 rounded-xl
                        ${isLight ? 'text-white' : 'text-white'}
                    `}>
                        <Icon size={sizes.icon / 2} />
                    </div>
                )}
                {trend && (
                    <TrendBadge
                        value={trend.value}
                        size="sm"
                        className={isLight ? 'bg-white/20 text-white border-white/20' : ''}
                    />
                )}
                {progress && !trend && (
                    <ProgressRing
                        value={progress.value}
                        max={progress.max}
                        size={44}
                        strokeWidth={5}
                        color={progress.color || (isLight ? '#fff' : '#6366f1')}
                        trackColor={isLight ? 'rgba(255,255,255,0.2)' : '#e2e8f0'}
                        showValue
                    />
                )}
            </div>

            {/* Middle Section - Title and Value */}
            <div className="mb-3">
                <p className={`${sizes.title} font-semibold uppercase tracking-wider ${styles.title} mb-1`}>
                    {title}
                </p>
                <p className={`${sizes.value} font-bold ${styles.value} tracking-tight`}>
                    {valuePrefix}{typeof value === 'number' ? value.toLocaleString() : value}{valueSuffix}
                </p>
            </div>

            {/* Sparkline */}
            {sparklineData && sparklineData.length > 0 && (
                <div className="mb-3">
                    <SparklineChart
                        data={sparklineData}
                        dataKey="value"
                        color={isLight ? '#ffffff' : '#6366f1'}
                        height={40}
                    />
                </div>
            )}

            {/* Bottom Section - Subtitle */}
            {subtitle && (
                <p className={`text-xs ${styles.subtitle} flex items-center gap-1 pt-3 border-t ${isLight ? 'border-white/10' : 'border-slate-100'}`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
};

/**
 * KPICardSkeleton - Loading state for KPICard
 */
export const KPICardSkeleton = ({ className = '' }) => (
    <div className={`bg-white p-5 rounded-2xl border border-slate-100 ${className}`}>
        <div className="flex justify-between items-start mb-4">
            <div className="w-11 h-11 rounded-xl skeleton" />
            <div className="w-16 h-5 rounded-full skeleton" />
        </div>
        <div className="space-y-2 mb-4">
            <div className="h-3 w-20 skeleton rounded" />
            <div className="h-7 w-32 skeleton rounded" />
        </div>
        <div className="h-10 w-full skeleton rounded mb-3" />
        <div className="h-4 w-24 skeleton rounded pt-3 border-t border-slate-100" />
    </div>
);

export default KPICard;
