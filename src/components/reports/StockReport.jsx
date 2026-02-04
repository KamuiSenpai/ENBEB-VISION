import React, { useMemo, useState } from 'react';
import { Icons } from '../ui/Icons';
import { formatCurrency } from '../../lib/utils';
import { useData } from '../../context/DataContext';

export const StockReport = () => {
    const { products, sales } = useData();
    const [sortConfig, setSortConfig] = useState({ key: 'suggested', direction: 'desc' });

    // --- LOGIC: Stock & Repositioning Analysis ---
    const stockAnalysis = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        // 1. Calculate Sales Velocity (Last 30 Days)
        const productSales = {};
        sales.forEach(s => {
            const saleDate = new Date(s.date);
            if (saleDate >= thirtyDaysAgo) {
                s.items.forEach(item => {
                    if (!productSales[item.productId]) productSales[item.productId] = 0;
                    productSales[item.productId] += item.qty;
                });
            }
        });

        // 2. Build Report Data
        return products
            .filter(p => p.status !== 'inactive')
            .map(p => {
                const sold30d = productSales[p.id] || 0;
                const dailyRate = sold30d / 30;
                // Target: Cover 45 days of inventory
                const targetStock = Math.ceil(dailyRate * 45);
                const suggested = Math.max(0, targetStock - p.stock);

                // Rotation Classification
                let rotation = { label: 'Normal', color: 'bg-gray-100 text-gray-600' };
                if (sold30d === 0) rotation = { label: 'Sin Movimiento', color: 'bg-red-100 text-red-600' };
                else if (dailyRate > 0.5) rotation = { label: 'Alta Rotación', color: 'bg-green-100 text-green-700' };
                else if (dailyRate < 0.1) rotation = { label: 'Lenta', color: 'bg-yellow-100 text-yellow-700' };

                return {
                    id: p.id,
                    name: p.name,
                    stock: p.stock,
                    cost: p.cost,
                    sold30d,
                    dailyRate,
                    rotation,
                    suggested,
                    investmentNeeded: suggested * p.cost
                };
            });
    }, [products, sales]);

    // --- SORTING ---
    const sortedData = useMemo(() => {
        let sortable = [...stockAnalysis];
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
    }, [stockAnalysis, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <Icons.ArrowDown size={14} className="text-gray-300 ml-1 opacity-0 group-hover:opacity-100" />;
        return <Icons.ArrowDown size={14} className={`ml-1 text-indigo-600 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />;
    };

    const totalInvestment = stockAnalysis.reduce((acc, curr) => acc + curr.investmentNeeded, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <Icons.Clipboard size={20} className="mr-2 text-indigo-600" />
                        Análisis de Reposición Inteligente
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                        El sistema analiza tus ventas de los últimos 30 días y sugiere compras para mantener un stock óptimo de 45 días.
                    </p>
                </div>
                <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 text-right">
                    <span className="block text-xs uppercase font-bold text-indigo-400 tracking-wide">Inversión Sugerida</span>
                    <span className="text-xl font-bold text-indigo-700">{formatCurrency(totalInvestment)}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 text-gray-500 border-b font-semibold uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-4 cursor-pointer hover:bg-gray-50 transition group select-none" onClick={() => handleSort('name')}>
                                    <div className="flex items-center">Producto {getSortIcon('name')}</div>
                                </th>
                                <th className="p-4 text-center cursor-pointer hover:bg-gray-50 transition group select-none" onClick={() => handleSort('stock')}>
                                    <div className="flex items-center justify-center">Stock Actual {getSortIcon('stock')}</div>
                                </th>
                                <th className="p-4 text-center cursor-pointer hover:bg-gray-50 transition group select-none" onClick={() => handleSort('sold30d')}>
                                    <div className="flex items-center justify-center">Ventas (30d) {getSortIcon('sold30d')}</div>
                                </th>
                                <th className="p-4 text-center cursor-pointer hover:bg-gray-50 transition group select-none" onClick={() => handleSort('dailyRate')}>
                                    <div className="flex items-center justify-center">Velocidad / Día {getSortIcon('dailyRate')}</div>
                                </th>
                                <th className="p-4 text-center">Rotación</th>
                                <th className="p-4 text-right bg-indigo-50/30 cursor-pointer hover:bg-indigo-50 transition group select-none text-indigo-900" onClick={() => handleSort('suggested')}>
                                    <div className="flex items-center justify-end">SUGERIDO {getSortIcon('suggested')}</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedData.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-800">{p.name}</div>
                                        <div className="text-xs text-gray-400">Costo Unit: {formatCurrency(p.cost)}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`font-bold ${p.stock <= 5 ? 'text-red-500' : 'text-gray-700'}`}>
                                            {p.stock}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center text-gray-600">{p.sold30d}</td>
                                    <td className="p-4 text-center text-xs font-mono text-gray-500">{p.dailyRate.toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${p.rotation.color} border-opacity-20`}>
                                            {p.rotation.label}
                                        </span>
                                    </td>
                                    <td className={`p-4 text-right font-mono border-l ${p.suggested > 0 ? 'bg-indigo-50/20 text-indigo-700 font-bold' : 'text-gray-300'}`}>
                                        {p.suggested > 0 ? `+${p.suggested}` : '-'}
                                        {p.suggested > 0 && <div className="text-[9px] text-gray-400 font-sans mt-0.5">{formatCurrency(p.investmentNeeded)}</div>}
                                    </td>
                                </tr>
                            ))}
                            {sortedData.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400 italic">No hay productos activos para analizar.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
