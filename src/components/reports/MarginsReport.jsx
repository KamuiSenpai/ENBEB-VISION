import React, { useMemo, useState } from 'react';
import { Icons } from '../ui/Icons';
import { formatCurrency } from '../../lib/utils';
import { useData } from '../../context/DataContext';

export const MarginsReport = () => {
    const { products, sales } = useData();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [sortConfig, setSortConfig] = useState({ key: 'margin', direction: 'desc' });

    const availableYears = [2023, 2024, 2025, 2026];

    // --- LOGIC: Margin Analysis ---
    const marginData = useMemo(() => {
        const productStats = {};

        // Aggregate Sales
        sales.forEach(sale => {
            const saleYear = new Date(sale.date).getFullYear();
            if (saleYear === parseInt(selectedYear)) {
                sale.items.forEach(item => {
                    const pid = item.productId;
                    if (!productStats[pid]) {
                        productStats[pid] = { qty: 0, revenue: 0, cost: 0 };
                    }
                    productStats[pid].qty += item.qty;
                    // Assuming item has 'price' (unit price sold) and 'subtotal'
                    // We need COST. 
                    // 1. Try to get cost from historical item (if stored in sale)
                    // 2. Fallback to current product cost

                    const subtotal = item.subtotal || (item.price * item.qty);
                    productStats[pid].revenue += subtotal;

                    // Historical cost would be ideal, but if not saved, use current cost from `products`
                    // We'll map later
                });
            }
        });

        // Map to Array
        const report = products
            .filter(p => productStats[p.id]) // Only show products with sales
            .map(p => {
                const stats = productStats[p.id];
                const totalCost = stats.qty * p.cost; // Estimation using current cost
                const profit = stats.revenue - totalCost;
                const margin = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0;

                return {
                    id: p.id,
                    name: p.name,
                    qty: stats.qty,
                    revenue: stats.revenue,
                    totalCost: totalCost,
                    profit: profit,
                    margin: margin
                };
            });

        return report;

    }, [products, sales, selectedYear]);

    // Sorting
    const sortedData = useMemo(() => {
        let sortable = [...marginData];
        if (sortConfig.key) {
            sortable.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [marginData, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const getSortIcon = (key) => <Icons.ArrowDown size={14} className={`ml-1 text-emerald-600 transition-transform ${sortConfig.key === key && sortConfig.direction === 'asc' ? 'rotate-180' : sortConfig.key !== key ? 'opacity-0' : ''}`} />;


    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
                <div className="mb-4 sm:mb-0">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Icons.Percent size={20} /></div>
                        Reporte de Rentabilidad
                    </h3>
                    <p className="text-sm text-gray-500 ml-11">Margen bruto estimado por producto.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600">Año Fiscal:</span>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 font-bold"
                    >
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-emerald-50/20 text-gray-500 border-b font-semibold uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-4 cursor-pointer hover:bg-emerald-50" onClick={() => handleSort('name')}>Producto {getSortIcon('name')}</th>
                            <th className="p-4 text-center cursor-pointer hover:bg-emerald-50" onClick={() => handleSort('qty')}>Unidades {getSortIcon('qty')}</th>
                            <th className="p-4 text-right cursor-pointer hover:bg-emerald-50" onClick={() => handleSort('revenue')}>Venta Total {getSortIcon('revenue')}</th>
                            <th className="p-4 text-right cursor-pointer hover:bg-emerald-50" onClick={() => handleSort('totalCost')}>Costo Est. {getSortIcon('totalCost')}</th>
                            <th className="p-4 text-right cursor-pointer hover:bg-emerald-50" onClick={() => handleSort('profit')}>Utilidad Bruta {getSortIcon('profit')}</th>
                            <th className="p-4 text-center cursor-pointer hover:bg-emerald-50" onClick={() => handleSort('margin')}>% Margen {getSortIcon('margin')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedData.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-800">{p.name}</td>
                                <td className="p-4 text-center text-gray-600">{p.qty}</td>
                                <td className="p-4 text-right text-gray-600">{formatCurrency(p.revenue)}</td>
                                <td className="p-4 text-right text-gray-400 text-xs">{formatCurrency(p.totalCost)}</td>
                                <td className="p-4 text-right font-bold text-emerald-700 bg-emerald-50/30">{formatCurrency(p.profit)}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${p.margin > 40 ? 'bg-emerald-100 text-emerald-800' : p.margin > 20 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                        {p.margin.toFixed(1)}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {sortedData.length === 0 && (
                            <tr>
                                <td colSpan="6" className="p-12 text-center text-gray-400 italic">No hay datos de ventas para el año {selectedYear}.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
