import React from 'react';

/**
 * Skeleton - Loading placeholder component
 * Use to show loading states while data is being fetched
 */
export const Skeleton = ({
    className = '',
    variant = 'text', // 'text' | 'title' | 'avatar' | 'card' | 'button' | 'custom'
    width,
    height,
    rounded = 'md', // 'sm' | 'md' | 'lg' | 'xl' | 'full'
    animate = true
}) => {
    const baseClasses = 'relative overflow-hidden bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]';

    const animationClass = animate ? 'animate-skeleton' : '';

    const roundedClasses = {
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full'
    };

    const variantClasses = {
        text: 'h-4 w-full rounded',
        title: 'h-6 w-3/4 rounded',
        avatar: 'h-10 w-10 rounded-full',
        card: 'h-32 w-full rounded-xl',
        button: 'h-10 w-24 rounded-lg',
        custom: ''
    };

    const style = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={`${baseClasses} ${animationClass} ${variantClasses[variant]} ${variant === 'custom' ? roundedClasses[rounded] : ''} ${className}`}
            style={style}
            role="status"
            aria-label="Cargando..."
        />
    );
};

/**
 * SkeletonText - Multiple lines of skeleton text
 */
export const SkeletonText = ({ lines = 3, className = '' }) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                variant="text"
                className={i === lines - 1 ? 'w-2/3' : 'w-full'}
                style={{ animationDelay: `${i * 100}ms` }}
            />
        ))}
    </div>
);

/**
 * SkeletonCard - Card-shaped skeleton with optional header
 */
export const SkeletonCard = ({ showHeader = true, showText = true, className = '' }) => (
    <div className={`bg-white p-6 rounded-2xl border border-slate-100 ${className}`}>
        {showHeader && (
            <div className="flex items-center gap-4 mb-4">
                <Skeleton variant="avatar" />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="custom" height={12} width="60%" />
                    <Skeleton variant="custom" height={10} width="40%" />
                </div>
            </div>
        )}
        {showText && <SkeletonText lines={3} />}
    </div>
);

/**
 * SkeletonTable - Table rows skeleton
 */
export const SkeletonTable = ({ rows = 5, columns = 4, className = '' }) => (
    <div className={`bg-white rounded-xl border border-slate-100 overflow-hidden ${className}`}>
        {/* Header */}
        <div className="bg-slate-50 p-4 flex gap-4 border-b">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} variant="custom" height={12} width={`${100 / columns}%`} />
            ))}
        </div>
        {/* Rows */}
        <div className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={rowIdx} className="p-4 flex gap-4 items-center" style={{ animationDelay: `${rowIdx * 50}ms` }}>
                    {Array.from({ length: columns }).map((_, colIdx) => (
                        <Skeleton
                            key={colIdx}
                            variant="custom"
                            height={16}
                            width={colIdx === 0 ? '30%' : `${70 / (columns - 1)}%`}
                        />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

/**
 * SkeletonKPI - KPI card skeleton for dashboard
 */
export const SkeletonKPI = ({ className = '' }) => (
    <div className={`bg-white p-6 rounded-2xl border border-slate-100 ${className}`}>
        <div className="flex justify-between items-start mb-4">
            <Skeleton variant="avatar" className="!w-12 !h-12 !rounded-lg" />
            <Skeleton variant="custom" width={60} height={24} rounded="full" />
        </div>
        <Skeleton variant="custom" width={80} height={10} className="mb-2" />
        <Skeleton variant="custom" width={120} height={28} className="mb-4" />
        <div className="pt-4 border-t border-slate-50 flex justify-between">
            <Skeleton variant="custom" width={100} height={12} />
            <Skeleton variant="custom" width={60} height={12} />
        </div>
    </div>
);

export default Skeleton;
