import React, { useState, useCallback, useMemo } from 'react';
import { Icons } from './Icons';
import { SearchInput, DensityToggle, FilterBar } from './FilterChip';
import { EmptyStatePresets } from './EmptyState';

/**
 * DataTable - Advanced table component with enterprise features
 */
export const DataTable = ({
    columns = [], // [{ key, header, render?, sortable?, width?, align? }]
    data = [],
    keyField = 'id',

    // Features
    selectable = false,
    searchable = true,
    filterable = true,
    densityControl = true,
    pagination = true,

    // State
    selectedRows = [],
    onSelectionChange,

    // Actions
    bulkActions = [], // [{ id, label, icon?, onClick, variant? }]
    rowActions = [], // [{ id, label, icon?, onClick }]

    // Customization
    emptyState = null,
    loading = false,
    pageSize = 10,
    className = ''
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [density, setDensity] = useState('normal');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilters, setActiveFilters] = useState([]);
    const [editingCell, setEditingCell] = useState(null); // { rowId, columnKey }

    // Density styles
    const densityStyles = {
        compact: { cell: 'py-2 px-3 text-xs', row: 'h-10' },
        normal: { cell: 'py-3 px-4 text-sm', row: 'h-14' },
        comfortable: { cell: 'py-4 px-5 text-sm', row: 'h-16' }
    };

    // Filter and sort data
    const processedData = useMemo(() => {
        let result = [...data];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(row =>
                columns.some(col => {
                    const value = row[col.key];
                    return value && String(value).toLowerCase().includes(query);
                })
            );
        }

        // Active filters
        activeFilters.forEach(filter => {
            result = result.filter(row => {
                const value = row[filter.key];
                return value && String(value).toLowerCase().includes(filter.value.toLowerCase());
            });
        });

        // Sorting
        if (sortConfig.key) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [data, searchQuery, sortConfig, activeFilters, columns]);

    // Pagination
    const totalPages = Math.ceil(processedData.length / pageSize);
    const paginatedData = pagination
        ? processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
        : processedData;

    // Selection
    const allSelected = paginatedData.length > 0 && selectedRows.length === paginatedData.length;
    const someSelected = selectedRows.length > 0 && selectedRows.length < paginatedData.length;

    const handleSelectAll = useCallback(() => {
        if (allSelected) {
            onSelectionChange?.([]);
        } else {
            onSelectionChange?.(paginatedData.map(row => row[keyField]));
        }
    }, [allSelected, paginatedData, keyField, onSelectionChange]);

    const handleSelectRow = useCallback((rowId) => {
        const isSelected = selectedRows.includes(rowId);
        if (isSelected) {
            onSelectionChange?.(selectedRows.filter(id => id !== rowId));
        } else {
            onSelectionChange?.([...selectedRows, rowId]);
        }
    }, [selectedRows, onSelectionChange]);

    const handleSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    const removeFilter = useCallback((filterId) => {
        setActiveFilters(prev => prev.filter(f => f.id !== filterId));
    }, []);

    const clearAllFilters = useCallback(() => {
        setActiveFilters([]);
        setSearchQuery('');
    }, []);

    return (
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Search */}
                    {searchable && (
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            onClear={() => setSearchQuery('')}
                            placeholder="Buscar en la tabla..."
                            className="w-64"
                        />
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        {densityControl && (
                            <DensityToggle value={density} onChange={setDensity} />
                        )}
                    </div>
                </div>

                {/* Active Filters */}
                {activeFilters.length > 0 && (
                    <FilterBar
                        filters={activeFilters.map(f => ({
                            id: f.id,
                            label: f.label,
                            value: f.value
                        }))}
                        onRemove={removeFilter}
                        onClearAll={clearAllFilters}
                    />
                )}

                {/* Bulk Actions */}
                {selectable && selectedRows.length > 0 && (
                    <div className="flex items-center gap-3 py-2 px-3 bg-indigo-50 rounded-xl animate-fade-in">
                        <span className="text-sm font-medium text-indigo-700">
                            {selectedRows.length} seleccionado{selectedRows.length > 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-2">
                            {bulkActions.map(action => (
                                <button
                                    key={action.id}
                                    onClick={() => action.onClick(selectedRows)}
                                    className={`
                                        inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                        ${action.variant === 'danger'
                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                        }
                                    `}
                                >
                                    {action.icon && <action.icon size={14} />}
                                    {action.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => onSelectionChange?.([])}
                            className="ml-auto text-xs text-indigo-600 hover:text-indigo-800"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            {selectable && (
                                <th className="w-12 px-4">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={el => el && (el.indeterminate = someSelected)}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </th>
                            )}
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={`
                                        ${densityStyles[density].cell}
                                        text-left font-semibold text-slate-600 uppercase text-xs tracking-wider
                                        ${col.sortable !== false ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}
                                    `}
                                    style={{ width: col.width }}
                                    onClick={() => col.sortable !== false && handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.header}
                                        {col.sortable !== false && sortConfig.key === col.key && (
                                            <Icons.ArrowUp
                                                size={14}
                                                className={`transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`}
                                            />
                                        )}
                                    </div>
                                </th>
                            ))}
                            {rowActions.length > 0 && (
                                <th className="w-20 px-4 text-right text-xs font-semibold text-slate-600 uppercase">
                                    Acciones
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            // Loading skeleton
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className={densityStyles[density].row}>
                                    {selectable && <td className="px-4"><div className="w-4 h-4 skeleton rounded" /></td>}
                                    {columns.map(col => (
                                        <td key={col.key} className={densityStyles[density].cell}>
                                            <div className="h-4 skeleton rounded w-3/4" />
                                        </td>
                                    ))}
                                    {rowActions.length > 0 && <td className="px-4" />}
                                </tr>
                            ))
                        ) : paginatedData.length === 0 ? (
                            // Empty state
                            <tr>
                                <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)}>
                                    {emptyState || (
                                        searchQuery
                                            ? <EmptyStatePresets.NoSearchResults onClear={clearAllFilters} />
                                            : <EmptyStatePresets.NoData />
                                    )}
                                </td>
                            </tr>
                        ) : (
                            // Data rows
                            paginatedData.map(row => {
                                const isSelected = selectedRows.includes(row[keyField]);
                                return (
                                    <tr
                                        key={row[keyField]}
                                        className={`
                                            ${densityStyles[density].row}
                                            transition-colors hover:bg-slate-50
                                            ${isSelected ? 'bg-indigo-50/50' : ''}
                                        `}
                                    >
                                        {selectable && (
                                            <td className="px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectRow(row[keyField])}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                        )}
                                        {columns.map(col => (
                                            <td
                                                key={col.key}
                                                className={`${densityStyles[density].cell} ${col.align === 'right' ? 'text-right' : ''}`}
                                            >
                                                {col.render ? col.render(row[col.key], row) : row[col.key]}
                                            </td>
                                        ))}
                                        {rowActions.length > 0 && (
                                            <td className="px-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {rowActions.map(action => (
                                                        <button
                                                            key={action.id}
                                                            onClick={() => action.onClick(row)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title={action.label}
                                                        >
                                                            {action.icon && <action.icon size={16} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                        Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, processedData.length)} de {processedData.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.ArrowUp size={16} className="-rotate-90" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                            const page = i + 1;
                            return (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`
                                        px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                                        ${currentPage === page
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 hover:bg-slate-100'
                                        }
                                    `}
                                >
                                    {page}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.ArrowUp size={16} className="rotate-90" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
