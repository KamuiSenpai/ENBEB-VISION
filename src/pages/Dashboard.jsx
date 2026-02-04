import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { Icons } from '../components/ui/Icons';
import { formatCurrency, formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';
import { getDateRange, filterByDateRange, generatePeriodTrendData, generateTopProductsData } from '../lib/analytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';

export const Dashboard = () => {
    const { sales, purchases, products, clients, expenses } = useData();

    // Period selector state
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [viewMode, setViewMode] = useState('month'); // 'today', 'month', 'year'

    const referenceDate = new Date(selectedYear, selectedMonth, 15);

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const years = [];
    for (let y = currentDate.getFullYear(); y >= currentDate.getFullYear() - 2; y--) {
        years.push(y);
    }

    const isCurrentPeriod = selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear();

    // --- OPERATIONAL METRICS ---
    const metrics = useMemo(() => {
        let start, end;

        if (viewMode === 'today') {
            const todayStr = currentDate.toISOString().split('T')[0];
            start = new Date(todayStr + 'T00:00:00');
            end = new Date(todayStr + 'T23:59:59');
        } else if (viewMode === 'year') {
            start = new Date(selectedYear, 0, 1);
            end = new Date(selectedYear, 11, 31, 23, 59, 59);
        } else {
            const range = getDateRange('month', referenceDate);
            start = range.start;
            end = range.end;
        }

        const periodSales = filterByDateRange(sales, start, end);
        const periodPurchases = filterByDateRange(purchases, start, end);
        const periodExpenses = filterByDateRange(expenses, start, end);

        const totalSales = periodSales.reduce((acc, s) => acc + s.total, 0);
        const totalCost = periodSales.reduce((acc, s) => {
            if (!s.items) return acc;
            return acc + s.items.reduce((a, i) => a + ((i.cost || 0) * i.qty), 0);
        }, 0);
        const totalExpenses = periodExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        const grossProfit = (totalSales / 1.18) - totalCost;
        const netProfit = grossProfit - totalExpenses;

        // Always current: Pending Collections/Payments
        const pendingSales = sales.filter(s => s.status === 'Pendiente');
        const totalReceivables = pendingSales.reduce((acc, s) => acc + s.total, 0);

        const pendingPurchases = purchases.filter(p => p.status === 'Pendiente');
        const totalPayables = pendingPurchases.reduce((acc, p) => acc + p.total, 0);

        // Inventory valuation (active products: stock * cost)
        const inventoryValue = products
            .filter(p => p.status !== 'inactive')
            .reduce((acc, p) => acc + ((p.stock || 0) * (p.cost || 0)), 0);

        return {
            totalSales,
            countSales: periodSales.length,
            grossProfit,
            netProfit,
            totalReceivables,
            totalPayables,
            inventoryValue,
            recentSales: [...sales].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
        };
    }, [sales, purchases, products, expenses, viewMode, referenceDate, selectedYear]);

    // Chart data - dynamic based on selected period
    const trendData = useMemo(() => generatePeriodTrendData(sales, purchases, expenses, viewMode, referenceDate, selectedYear), [sales, purchases, expenses, viewMode, referenceDate, selectedYear]);
    const topProductsData = useMemo(() => generateTopProductsData(sales, viewMode, referenceDate, selectedYear), [sales, viewMode, referenceDate, selectedYear]);

    const displayDate = currentDate.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const getPeriodLabel = () => {
        if (viewMode === 'today') return 'Hoy';
        if (viewMode === 'year') return `Año ${selectedYear}`;
        return `${months[selectedMonth]} ${selectedYear}`;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">

            {/* --- PERIOD SELECTOR BAR --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 capitalize">{displayDate}</span>
                    {!isCurrentPeriod && viewMode !== 'today' && (
                        <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-lg font-medium">
                            Viendo: {getPeriodLabel()}
                        </span>
                    )}
                </div>

                {/* Period Selector */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* View Mode */}
                    <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
                        {['today', 'month', 'year'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === mode
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                    }`}
                            >
                                {mode === 'today' ? 'Hoy' : mode === 'month' ? 'Mes' : 'Año'}
                            </button>
                        ))}
                    </div>

                    {/* Month/Year Selector */}
                    {viewMode !== 'today' && (
                        <div className="bg-slate-100 rounded-xl p-1 flex items-center gap-1">
                            {viewMode === 'month' && (
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="bg-transparent text-slate-700 text-sm px-2 py-1.5 outline-none cursor-pointer font-medium"
                                >
                                    {months.map((m, idx) => (
                                        <option key={idx} value={idx}>{m}</option>
                                    ))}
                                </select>
                            )}
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="bg-transparent text-slate-700 text-sm px-2 py-1.5 outline-none cursor-pointer font-medium"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Reset Button */}
                    {!isCurrentPeriod && viewMode !== 'today' && (
                        <button
                            onClick={() => { setSelectedMonth(currentDate.getMonth()); setSelectedYear(currentDate.getFullYear()); }}
                            className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg font-bold hover:bg-indigo-100 transition"
                        >
                            Hoy
                        </button>
                    )}
                </div>
            </div>

            {/* --- MAIN METRICS GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

                {/* 1. VENTAS PERÍODO */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col justify-between group hover:shadow-md transition-all">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform"><Icons.ShoppingCart size={24} /></div>
                            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{getPeriodLabel()}</span>
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ventas</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{formatCurrency(metrics.totalSales)}</h3>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-sm">
                        <span className="text-slate-500">{metrics.countSales} transacciones</span>
                        <Link to="/sales" className="text-emerald-600 font-bold hover:underline flex items-center">Ver Todo <Icons.ArrowUp size={14} className="rotate-45 ml-1" /></Link>
                    </div>
                </div>

                {/* 2. UTILIDAD NETA */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-between group hover:shadow-md transition-all">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform"><Icons.TrendingUp size={24} /></div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${metrics.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {metrics.netProfit >= 0 ? '+' : ''}{((metrics.netProfit / (metrics.totalSales || 1)) * 100).toFixed(0)}%
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Utilidad Neta</p>
                        <h3 className={`text-3xl font-extrabold mt-1 ${metrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(metrics.netProfit)}
                        </h3>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-sm">
                        <span className="text-slate-500">Margen neto</span>
                        <Link to="/analytics" className="text-indigo-600 font-bold hover:underline flex items-center">Analizar <Icons.ArrowUp size={14} className="rotate-45 ml-1" /></Link>
                    </div>
                </div>

                {/* 3. POR COBRAR */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-between group hover:shadow-md transition-all">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform"><Icons.Wallet size={24} /></div>
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{metrics.totalReceivables > 0 ? 'Pendiente' : 'Al día'}</span>
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Por Cobrar</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{formatCurrency(metrics.totalReceivables)}</h3>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-sm">
                        <span className="text-slate-500">Créditos activos</span>
                        <Link to="/reports" className="text-blue-600 font-bold hover:underline flex items-center">Gestionar <Icons.ArrowUp size={14} className="rotate-45 ml-1" /></Link>
                    </div>
                </div>

                {/* 4. VALORIZADO INVENTARIO */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 flex flex-col justify-between group hover:shadow-md transition-all">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform"><Icons.Box size={24} /></div>
                            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Activo</span>
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Inventario</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{formatCurrency(metrics.inventoryValue)}</h3>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-sm">
                        <span className="text-slate-500">Valorizado al costo</span>
                        <Link to="/inventory" className="text-purple-600 font-bold hover:underline flex items-center">Ver Stock <Icons.ArrowUp size={14} className="rotate-45 ml-1" /></Link>
                    </div>
                </div>

                {/* 5. POR PAGAR */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex flex-col justify-between group hover:shadow-md transition-all">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:scale-110 transition-transform"><Icons.CreditCard size={24} /></div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${metrics.totalPayables > 0 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {metrics.totalPayables > 0 ? 'Pendiente' : 'Al día'}
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Por Pagar</p>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{formatCurrency(metrics.totalPayables)}</h3>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-sm">
                        <span className="text-slate-500">Deudas proveedores</span>
                        <Link to="/reports" className="text-orange-600 font-bold hover:underline flex items-center">Gestionar <Icons.ArrowUp size={14} className="rotate-45 ml-1" /></Link>
                    </div>
                </div>
            </div>

            {/* --- CHART & ACTIVITY --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* SALES BY CLIENT CHART */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Icons.Users className="text-indigo-500" />
                        Ventas por Cliente - {viewMode === 'today' ? 'Hoy' : viewMode === 'month' ? `${months[selectedMonth]} ${selectedYear}` : `Año ${selectedYear}`}
                    </h3>
                    <div className="flex gap-4 mb-4 text-xs">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Total Ventas</div>
                        <span className="text-slate-400">Top 8 clientes del período</span>
                    </div>
                    <div className="h-[280px]">
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `S/ ${(v / 1000).toFixed(0)}k`} />
                                    <YAxis type="category" dataKey="cliente" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} width={180} />
                                    <Tooltip
                                        formatter={(value, name, props) => [formatCurrency(value), 'Ventas']}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                                    />
                                    <Bar dataKey="ventas" radius={[0, 4, 4, 0]}>
                                        {trendData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#22c55e' : '#6ee7b7'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                No hay ventas en este período
                            </div>
                        )}
                    </div>
                </div>

                {/* TOP PRODUCTS CHART */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Icons.BarChart2 className="text-orange-500" />
                        Top 10 Productos - {viewMode === 'today' ? 'Hoy' : viewMode === 'month' ? `${months[selectedMonth]} ${selectedYear}` : `Año ${selectedYear}`}
                    </h3>
                    <div className="flex gap-4 mb-4 text-xs">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div> Ventas (S/)</div>
                    </div>
                    <div className="h-[350px]">
                        {topProductsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProductsData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f1f5f9" />
                                    <XAxis
                                        type="number"
                                        axisLine={false}
                                        tickLine={false}
                                        domain={[0, 'dataMax']}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        tickFormatter={(v) => `S/ ${(v / 1000).toFixed(1)}k`}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 9, fill: '#475569', fontWeight: 500 }}
                                        width={160}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value, name) => [formatCurrency(value), 'Ventas']}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                                        cursor={{ fill: '#fff7ed' }}
                                    />
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={32}>
                                        {topProductsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#ea580c' : index === 1 ? '#f97316' : index === 2 ? '#fb923c' : '#fdba74'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                No hay productos vendidos en este período
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Icons.History className="text-slate-500" /> Actividad Reciente
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-bold">
                            <tr>
                                <th className="p-3">Fecha</th>
                                <th className="p-3">Cliente</th>
                                <th className="p-3 text-center">Estado</th>
                                <th className="p-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {metrics.recentSales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-mono text-xs text-slate-500">
                                        {formatDate(sale.date)}
                                    </td>
                                    <td className="p-3 font-medium text-slate-700">{sale.clientName}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${sale.status === 'Pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {sale.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-bold text-slate-800">{formatCurrency(sale.total)}</td>
                                </tr>
                            ))}
                            {metrics.recentSales.length === 0 && (
                                <tr><td colSpan="4" className="p-6 text-center text-slate-400 italic">No hay actividad reciente.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div >
        </div >
    );
};

