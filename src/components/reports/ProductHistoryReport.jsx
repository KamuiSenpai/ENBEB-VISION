import React, { useState, useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { formatCurrency } from '../../lib/utils';
import { useData } from '../../context/DataContext';

export const ProductHistoryReport = () => {
    const { products, sales } = useData();
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const months = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    const [sortConfig, setSortConfig] = useState({ key: 'totalQty', direction: 'desc' });

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <Icons.ChevronsUpDown size={14} className="text-gray-300 ml-1" />;
        return sortConfig.direction === 'asc'
            ? <Icons.ArrowUp size={14} className="text-indigo-600 ml-1" />
            : <Icons.ArrowDown size={14} className="text-indigo-600 ml-1" />;
    };

    // Generate available years based on sales history
    const years = useMemo(() => {
        const uniqueYears = new Set(sales.map(s => new Date(s.date).getFullYear()));
        uniqueYears.add(currentDate.getFullYear());
        return Array.from(uniqueYears).sort((a, b) => b - a);
    }, [sales]);

    // Data Processing: Aggregate quantity per product per month
    const reportData = useMemo(() => {
        // ... (data aggregation logic stays the same) ...
        // Initialize map with all products
        const productMap = {};

        products.forEach(p => {
            productMap[p.id] = {
                id: p.id,
                name: p.name,
                category: p.category || 'General',
                stock: p.stock,
                monthlyQty: Array(12).fill(0),
                totalQty: 0,
                totalRevenue: 0
            };
        });

        // Fill with sales data
        sales.forEach(sale => {
            const saleDate = new Date(sale.date);
            if (saleDate.getFullYear() !== selectedYear) return;
            if (sale.status === 'Anulado') return; // Ignore cancelled sales

            const monthIdx = saleDate.getMonth();

            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    const prodId = item.productId;
                    // If product exists in catalog (or we create a temp entry for deleted products)
                    if (!productMap[prodId]) {
                        productMap[prodId] = {
                            id: prodId,
                            name: item.productName || 'Producto Eliminado',
                            category: 'Otros',
                            stock: 0,
                            monthlyQty: Array(12).fill(0),
                            totalQty: 0,
                            totalRevenue: 0
                        };
                    }

                    productMap[prodId].monthlyQty[monthIdx] += (item.qty || 0);
                    productMap[prodId].totalQty += (item.qty || 0);
                    productMap[prodId].totalRevenue += (item.price * item.qty || 0);
                });
            }
        });

        // Convert to array, filter, AND SORT
        return Object.values(productMap)
            .filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.category.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                let valA, valB;

                // Sort by Product Name
                if (sortConfig.key === 'name') {
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }

                // Sort by Total
                if (sortConfig.key === 'totalQty') {
                    valA = a.totalQty;
                    valB = b.totalQty;
                }
                // Sort by Month Index (0-11)
                else if (typeof sortConfig.key === 'number') {
                    valA = a.monthlyQty[sortConfig.key];
                    valB = b.monthlyQty[sortConfig.key];
                }

                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            });

    }, [products, sales, selectedYear, searchTerm, sortConfig]);

    // ... (rest of component) ...


    // Calculate totals per month (footer)
    const monthlyTotals = useMemo(() => {
        const totals = Array(12).fill(0);
        let grandTotal = 0;
        reportData.forEach(p => {
            p.monthlyQty.forEach((qty, idx) => totals[idx] += qty);
            grandTotal += p.totalQty;
        });
        return { totals, grandTotal };
    }, [reportData]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-gray-500 font-medium">Año:</span>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-700 outline-none cursor-pointer hover:bg-gray-100"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Exportar"
                        onClick={() => alert("Función de exportar pendiente")} // TODO: Implement CSV export
                    >
                        <Icons.Download size={20} />
                    </button>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs sticky top-0 z-10">
                            <tr>
                                <th
                                    className="p-1 pl-2 text-left min-w-[300px] border-b border-gray-200 bg-gray-50 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-gray-100 transition-colors group"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center justify-between">
                                        PRODUCTO {getSortIcon('name')}
                                    </div>
                                </th>
                                {months.map((m, i) => (
                                    <th
                                        key={i}
                                        className="p-2 text-center min-w-[50px] border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort(i)}
                                    >
                                        <div className="flex items-center justify-center gap-1 text-xs">
                                            {m} {sortConfig.key === i && getSortIcon(i)}
                                        </div>
                                    </th>
                                ))}
                                <th
                                    className="p-2 text-center min-w-[70px] bg-indigo-50 text-indigo-700 border-b border-indigo-100 font-extrabold cursor-pointer hover:bg-indigo-100 transition-colors"
                                    onClick={() => handleSort('totalQty')}
                                >
                                    <div className="flex items-center justify-center gap-1 text-xs">
                                        TOTAL {getSortIcon('totalQty')}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reportData.length > 0 ? (
                                reportData.map((prod, idx) => (
                                    <tr key={prod.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-1 pl-2 bg-white group-hover:bg-blue-50/30 sticky left-0 z-10 border-r border-gray-100 font-medium text-gray-800">
                                            <div className="min-w-[300px] text-xs font-bold leading-tight" title={prod.name}>
                                                {prod.name}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-normal min-w-[300px]">{prod.category}</div>
                                        </td>
                                        {prod.monthlyQty.map((qty, i) => (
                                            <td key={i} className={`p-1 text-center text-xs ${qty > 0 ? 'text-gray-800 font-bold' : 'text-gray-300'}`}>
                                                {qty > 0 ? qty : '-'}
                                            </td>
                                        ))}
                                        <td className="p-1 text-center text-xs font-bold text-indigo-600 bg-indigo-50/30">
                                            {prod.totalQty}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={14} className="p-8 text-center text-gray-400 italic">
                                        No se encontraron datos para este período
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {/* Footer Totals */}
                        {reportData.length > 0 && (
                            <tfoot className="bg-gray-50 border-t border-gray-200 font-bold text-gray-700">
                                <tr>
                                    <td className="p-4 sticky left-0 z-10 bg-gray-50 border-r border-gray-200 text-right">TOTALES MENSUALES</td>
                                    {monthlyTotals.totals.map((total, i) => (
                                        <td key={i} className="p-3 text-center">{total > 0 ? total : '-'}</td>
                                    ))}
                                    <td className="p-4 text-center text-indigo-700 bg-indigo-50">{monthlyTotals.grandTotal}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            <div className="text-right text-xs text-gray-400 italic">
                * Cantidades expresadas en unidades vendidas (sin incluir anuladas)
            </div>
        </div>
    );
};
