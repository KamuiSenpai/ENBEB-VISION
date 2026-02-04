import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Icons } from '../components/ui/Icons';
import { formatCurrency } from '../lib/utils';
import { StockReport } from '../components/reports/StockReport';
import { ReceivablesReport } from '../components/reports/ReceivablesReport';
import { PayablesReport } from '../components/reports/PayablesReport';
import { MarginsReport } from '../components/reports/MarginsReport';
import { CashFlowReport } from '../components/reports/CashFlowReport';
import { ProductHistoryReport } from '../components/reports/ProductHistoryReport';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

export const Reports = () => {
    const { sales, expenses, clients, suppliers, products } = useData();
    const [activeTab, setActiveTab] = useState('overview');
    const [dateRange, setDateRange] = useState('month'); // month, quarter, year

    // --- AGGREGATED METRICS FOR OVERVIEW ---
    const metrics = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Helper to filter by range
        const isInRange = (dateStr) => {
            const d = new Date(dateStr);
            if (dateRange === 'month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            if (dateRange === 'quarter') {
                const q = Math.floor(currentMonth / 3);
                return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === currentYear;
            }
            if (dateRange === 'year') return d.getFullYear() === currentYear;
            return true;
        };

        const filteredSales = sales.filter(s => isInRange(s.date));
        const filteredExpenses = expenses.filter(e => isInRange(e.date));

        const totalSales = filteredSales.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
        const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        const netMargin = totalSales - totalExpenses;
        const marginPercent = totalSales > 0 ? (netMargin / totalSales) * 100 : 0;

        // Sparkline Data (Daily data for the range)
        const sparklineData = [];
        const daysMap = {};

        filteredSales.forEach(s => {
            const d = s.date;
            if (!daysMap[d]) daysMap[d] = { date: d, sales: 0, expenses: 0 };
            daysMap[d].sales += (parseFloat(s.total) || 0);
        });
        filteredExpenses.forEach(e => {
            const d = e.date;
            if (!daysMap[d]) daysMap[d] = { date: d, sales: 0, expenses: 0 };
            daysMap[d].expenses += (parseFloat(e.amount) || 0);
        });

        // Convert map to array and sort
        Object.values(daysMap).sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(item => {
            sparklineData.push(item);
        });

        // Other Quick Stats
        const lowStockCount = products.filter(p => parseInt(p.stock) <= parseInt(p.minStock || 5)).length;
        const totalReceivables = clients.reduce((acc, c) => acc + (c.debt || 0), 0); // Assuming client object has debt tracking if implemented, otherwise 0 placeholder

        return { totalSales, totalExpenses, netMargin, marginPercent, sparklineData, lowStockCount, totalReceivables };
    }, [sales, expenses, products, clients, dateRange]);

    const tabs = [
        { id: 'overview', label: 'Panorama General', icon: <Icons.Dashboard size={18} /> },
        { id: 'stock', label: 'Inventario', icon: <Icons.Package size={18} /> },
        { id: 'receivables', label: 'Ctas. por Cobrar', icon: <Icons.UserCheck size={18} /> },
        { id: 'payables', label: 'Ctas. por Pagar', icon: <Icons.CreditCard size={18} /> },
        { id: 'margins', label: 'Rentabilidad', icon: <Icons.Percent size={18} /> },

        { id: 'cashflow', label: 'Flujo de Caja', icon: <Icons.Activity size={18} /> },
        { id: 'history', label: 'Historial', icon: <Icons.History size={18} /> },
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-12">

            {/* Header & Global Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Icons.BarChart className="text-blue-600" /> Centro de Inteligencia
                    </h2>
                    <p className="text-slate-500 text-sm">Visión de 360° del rendimiento de tu negocio.</p>
                </div>

                <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                    {['month', 'quarter', 'year'].map(range => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${dateRange === range ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {range === 'month' ? 'Este Mes' : range === 'quarter' ? 'Trimestre' : 'Año Fiscal'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Navigation Pills */}
            <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${activeTab === tab.id ?
                            'bg-blue-600 text-white border-blue-600 shadow-blue-200 shadow-lg scale-105' :
                            'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* DASHBOARD CONTENT */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-inScale">
                    {/* KEY METRICS CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* SALES CARD */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative overflow-hidden group">
                            <div className="flex justify-between items-start z-10">
                                <div>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Ventas Netas</p>
                                    <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.totalSales)}</h3>
                                </div>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:rotate-12 transition-transform"><Icons.TrendingUp size={20} /></div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metrics.sparklineData}>
                                        <Area type="monotone" dataKey="sales" name="Ventas" stroke="#2563eb" fill="#3b82f6" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* MARGIN CARD */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative overflow-hidden group">
                            <div className="z-10">
                                <div className="flex justify-between items-start">
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Margen Neto</p>
                                    <div className={`px-2 py-0.5 rounded text-xs font-bold ${metrics.netMargin >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {metrics.marginPercent.toFixed(1)}%
                                    </div>
                                </div>
                                <h3 className={`text-2xl font-bold ${metrics.netMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(metrics.netMargin)}</h3>
                            </div>
                            <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform">
                                <Icons.Percent size={100} />
                            </div>
                        </div>

                        {/* EXPENSES CARD */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative overflow-hidden group">
                            <div className="flex justify-between items-start z-10">
                                <div>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Gastos Totales</p>
                                    <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.totalExpenses)}</h3>
                                </div>
                                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:rotate-12 transition-transform"><Icons.Wallet size={20} /></div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics.sparklineData}>
                                        <Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* ALERTS CARD */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between h-40 relative overflow-hidden">
                            <div className="z-10">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Estado del Sistema</p>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className={`w-3 h-3 rounded-full ${metrics.lowStockCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                    <span className="font-bold text-lg">{metrics.lowStockCount > 0 ? 'Atención Requerida' : 'Sistema Estable'}</span>
                                </div>
                                {metrics.lowStockCount > 0 ? (
                                    <p className="text-slate-300 text-xs">{metrics.lowStockCount} productos con stock bajo mínimo.</p>
                                ) : (
                                    <p className="text-slate-300 text-xs">Inventario saludable.</p>
                                )}
                            </div>
                            <button onClick={() => setActiveTab('stock')} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg w-fit transition flex items-center gap-2">
                                Ver Inventario <Icons.ArrowUp className="rotate-90" size={12} />
                            </button>
                        </div>
                    </div>

                    {/* MAIN CHART AREA */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Icons.Activity className="text-blue-500" size={20} /> Flujo de Caja (Ingresos vs Egresos)</h3>
                                <div className="flex gap-2 text-xs">
                                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Ventas</div>
                                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500 rounded-sm"></div> Gastos</div>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metrics.sparklineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => v.substring(5)} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `S/ ${v / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value) => formatCurrency(value)}
                                        />
                                        <Area type="monotone" dataKey="sales" name="Ventas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                        <Area type="monotone" dataKey="expenses" name="Gastos" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* SIDEBAR WIDGETS */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Icons.Zap className="text-amber-500" size={18} /> Acciones Rápidas</h3>
                                <div className="space-y-3">
                                    <button onClick={() => window.print()} className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium transition group">
                                        <span className="flex items-center gap-2 text-gray-700"><Icons.DownloadCloud size={16} /> Exportar Reporte PDF</span>
                                        <Icons.ArrowUp className="rotate-45 text-gray-400 group-hover:text-gray-600" size={14} />
                                    </button>
                                    <button className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium transition group">
                                        <span className="flex items-center gap-2 text-gray-700"><Icons.Filter size={16} /> Configurar Alertas de Stock</span>
                                        <Icons.ArrowUp className="rotate-45 text-gray-400 group-hover:text-gray-600" size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><Icons.Award size={80} /></div>
                                <h3 className="font-bold text-lg mb-1 relative z-10">Objetivo Mensual</h3>
                                <p className="text-indigo-200 text-xs mb-4 relative z-10">Progreso de ventas vs meta (S/ 50,000)</p>

                                <div className="relative z-10">
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span>{((metrics.totalSales / 50000) * 100).toFixed(0)}%</span>
                                        <span>S/ 50,000</span>
                                    </div>
                                    <div className="w-full bg-indigo-900/50 rounded-full h-2">
                                        <div className="bg-white rounded-full h-2 transition-all duration-1000" style={{ width: `${Math.min((metrics.totalSales / 50000) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* OTHER TABS */}
            <div className={`transition-opacity duration-300 ${activeTab !== 'overview' ? 'opacity-100' : 'hidden opacity-0 h-0 overflow-hidden'}`}>
                {activeTab === 'stock' && <div className="animate-fade-in"><StockReport /></div>}
                {activeTab === 'receivables' && <div className="animate-fade-in"><ReceivablesReport /></div>}
                {activeTab === 'payables' && <div className="animate-fade-in"><PayablesReport /></div>}
                {activeTab === 'margins' && <div className="animate-fade-in"><MarginsReport /></div>}
                {activeTab === 'cashflow' && <div className="animate-fade-in"><CashFlowReport /></div>}
                {activeTab === 'history' && <div className="animate-fade-in"><ProductHistoryReport /></div>}
            </div>
        </div>
    );
};
