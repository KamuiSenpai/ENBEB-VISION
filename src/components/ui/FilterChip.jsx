import React from 'react';
import { Icons } from './Icons';

/**
 * FilterChip - Removable filter chip component
 */
export const FilterChip = ({
    label,
    value,
    onRemove,
    color = 'indigo',
    size = 'md',
    className = ''
}) => {
    const colorClasses = {
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
        red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
        slate: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
    };

    const sizeClasses = {
        sm: 'text-[10px] px-2 py-0.5 gap-1',
        md: 'text-xs px-2.5 py-1 gap-1.5',
        lg: 'text-sm px-3 py-1.5 gap-2'
    };

    return (
        <span className={`
            inline-flex items-center rounded-full border font-medium transition-colors
            ${colorClasses[color]}
            ${sizeClasses[size]}
            ${className}
        `}>
            {label && <span className="text-slate-500">{label}:</span>}
            <span>{value}</span>
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                >
                    <Icons.X size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} />
                </button>
            )}
        </span>
    );
};

/**
 * FilterBar - Container for active filters with clear all option
 */
export const FilterBar = ({
    filters = [], // [{ id, label, value, color? }]
    onRemove,
    onClearAll,
    className = ''
}) => {
    if (filters.length === 0) return null;

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            <span className="text-xs text-slate-400 font-medium">Filtros activos:</span>
            {filters.map((filter) => (
                <FilterChip
                    key={filter.id}
                    label={filter.label}
                    value={filter.value}
                    color={filter.color || 'indigo'}
                    onRemove={() => onRemove(filter.id)}
                />
            ))}
            {filters.length > 1 && (
                <button
                    onClick={onClearAll}
                    className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors flex items-center gap-1"
                >
                    <Icons.X size={12} />
                    Limpiar todo
                </button>
            )}
        </div>
    );
};

/**
 * SearchInput - Styled search input
 */
export const SearchInput = ({
    value,
    onChange,
    placeholder = 'Buscar...',
    onClear,
    size = 'md',
    className = ''
}) => {
    const sizeClasses = {
        sm: 'h-8 text-xs pl-8 pr-8',
        md: 'h-10 text-sm pl-10 pr-10',
        lg: 'h-12 text-base pl-12 pr-12'
    };

    const iconSizes = { sm: 14, md: 16, lg: 18 };

    return (
        <div className={`relative ${className}`}>
            <Icons.Search
                size={iconSizes[size]}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`
                    w-full rounded-xl border border-slate-200 bg-white
                    focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 
                    outline-none transition-all placeholder-slate-400
                    ${sizeClasses[size]}
                `}
            />
            {value && onClear && (
                <button
                    onClick={onClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <Icons.X size={iconSizes[size]} />
                </button>
            )}
        </div>
    );
};

/**
 * DensityToggle - Toggle between table density options
 */
export const DensityToggle = ({
    value = 'normal', // 'compact' | 'normal' | 'comfortable'
    onChange,
    className = ''
}) => {
    const options = [
        { id: 'compact', icon: '═', label: 'Compacto' },
        { id: 'normal', icon: '☰', label: 'Normal' },
        { id: 'comfortable', icon: '≡', label: 'Amplio' }
    ];

    return (
        <div className={`inline-flex items-center bg-slate-100 rounded-lg p-0.5 ${className}`}>
            {options.map((option) => (
                <button
                    key={option.id}
                    onClick={() => onChange(option.id)}
                    title={option.label}
                    className={`
                        px-2.5 py-1.5 text-xs font-medium rounded-md transition-all
                        ${value === option.id
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }
                    `}
                >
                    {option.icon}
                </button>
            ))}
        </div>
    );
};

export default FilterChip;
