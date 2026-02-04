import React, { useMemo, useState } from 'react';
import { Icons } from '../ui/Icons';
import { formatCurrency } from '../../lib/utils';
import { useData } from '../../context/DataContext';
import {
    calculateIncomeStatement,
    calculateLiquidityKPIs,
    calculateInventoryKPIs,
    calculateSalesGoalProgress,
    getDateRange,
    filterByDateRange,
    generateMonthlyTrendData
} from '../../lib/analytics';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const KPIDashboard = ({ period = 'month', salesGoal = 0, referenceDate = new Date() }) => {
    const { sales, purchases, expenses, products } = useData();

    // Filter data by period using the referenceDate
    const { start, end } = useMemo(() => getDateRange(period, referenceDate), [period, referenceDate]);
    const daysInPeriod = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const filteredSales = useMemo(() => filterByDateRange(sales, start, end), [sales, start, end]);
    const filteredPurchases = useMemo(() => filterByDateRange(purchases, start, end), [purchases, start, end]);
    const filteredExpenses = useMemo(() => filterByDateRange(expenses, start, end), [expenses, start, end]);

    // Calculate KPIs
    const incomeStatement = useMemo(() =>
        calculateIncomeStatement(filteredSales, filteredPurchases, filteredExpenses),
        [filteredSales, filteredPurchases, filteredExpenses]
    );

    const liquidity = useMemo(() =>
        calculateLiquidityKPIs(filteredSales, filteredPurchases, daysInPeriod),
        [filteredSales, filteredPurchases, daysInPeriod]
    );

    const inventory = useMemo(() =>
        calculateInventoryKPIs(products, filteredSales, daysInPeriod),
        [products, filteredSales, daysInPeriod]
    );

    const goalProgress = useMemo(() =>
        calculateSalesGoalProgress(sales, salesGoal, period),
        [sales, salesGoal, period]
    );

    // Chart data (always shows last 6 months from reference)
    const trendData = useMemo(() => generateMonthlyTrendData(sales, purchases, expenses, 6), [sales, purchases, expenses]);

    // KPI Card Component
    const KPICard = ({ title, value, subtitle, icon, color, trend, format = 'currency' }) => {
        const colorClasses = {
            emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
            blue: 'from-blue-500 to-blue-600 shadow-blue-500/20',
            purple: 'from-purple-500 to-purple-600 shadow-purple-500/20',
            amber: 'from-amber-500 to-amber-600 shadow-amber-500/20',
            rose: 'from-rose-500 to-rose-600 shadow-rose-500/20',
            indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/20',
            slate: 'from-slate-600 to-slate-700 shadow-slate-500/20'
        };

        return (
            <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl p-5 text-white shadow-lg`}>
                <div className="flex justify-between items-start mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">{icon}</div>
                    {trend && (
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${trend > 0 ? 'bg-white/30' : 'bg-black/20'
                            }`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
                        </span>
                    )}
                </div>
                <p className="text-white/80 text-xs font-bold uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-bold mt-1">
                    {format === 'currency' ? formatCurrency(value) : format === 'percent' ? `${value.toFixed(1)}%` : value}
                </p>
                {subtitle && <p className="text-white/60 text-xs mt-2">{subtitle}</p>}
            </div>
        );
    };

    // Gauge Component for Sales Goal
    const SalesGauge = () => {
        const progress = Math.min(goalProgress.progress, 100);
        const circumference = 2 * Math.PI * 60;
        const strokeDashoffset = circumference - (progress / 100) * circumference;

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Icons.Target size={20} className="text-indigo-500" /> Meta de Ventas
                </h3>
                <div className="flex items-center justify-center">
                    <div className="relative">
                        <svg width="150" height="150" className="transform -rotate-90">
                            <circle
                                cx="75"
                                cy="75"
                                r="60"
                                stroke="#e2e8f0"
                                strokeWidth="12"
                                fill="none"
                            />
                            <circle
                                cx="75"
                                cy="75"
                                r="60"
                                stroke={goalProgress.onTrack ? '#10b981' : '#f59e0b'}
                                strokeWidth="12"
                                fill="none"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-gray-800">{goalProgress.progress.toFixed(0)}%</span>
                            <span className="text-xs text-gray-500">alcanzado</span>
                        </div>
                    </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Actual</span>
                        <span className="font-bold text-gray-800">{formatCurrency(goalProgress.currentSales)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Meta</span>
                        <span className="font-bold text-gray-800">{formatCurrency(goalProgress.goalAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-500">Proyección</span>
                        <span className={`font-bold ${goalProgress.onTrack ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {formatCurrency(goalProgress.projectedTotal)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Días restantes</span>
                        <span className="font-bold text-gray-800">{goalProgress.daysRemaining}</span>
                    </div>
                    {goalProgress.requiredDaily > 0 && (
                        <div className="bg-amber-50 p-3 rounded-lg mt-3 border border-amber-100">
                            <p className="text-amber-700 text-xs font-medium">
                                Necesitas {formatCurrency(goalProgress.requiredDaily)}/día para alcanzar la meta
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Profitability KPIs */}
            <div>
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Icons.TrendingUp size={18} /> Indicadores de Rentabilidad
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard
                        title="Margen Bruto"
                        value={incomeStatement.grossMargin}
                        format="percent"
                        icon={<Icons.Percent size={18} />}
                        color="emerald"
                        subtitle={incomeStatement.grossMargin >= 40 ? '✓ Excelente' : incomeStatement.grossMargin >= 25 ? '◦ Bueno' : '⚠ Bajo'}
                    />
                    <KPICard
                        title="Margen EBITDA"
                        value={incomeStatement.ebitdaMargin}
                        format="percent"
                        icon={<Icons.Activity size={18} />}
                        color="purple"
                        subtitle={incomeStatement.ebitdaMargin >= 15 ? '✓ Saludable' : '⚠ Revisar gastos'}
                    />
                    <KPICard
                        title="Margen Neto"
                        value={incomeStatement.netMargin}
                        format="percent"
                        icon={<Icons.DollarSign size={18} />}
                        color="blue"
                        subtitle={incomeStatement.netMargin >= 10 ? '✓ Muy bueno' : '◦ Normal'}
                    />
                    <KPICard
                        title="EBITDA"
                        value={incomeStatement.ebitda}
                        icon={<Icons.BarChart2 size={18} />}
                        color="indigo"
                        subtitle={`${incomeStatement.transactionCount} transacciones`}
                    />
                </div>
            </div>

            {/* Liquidity & Inventory KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Icons.Clock size={18} /> Indicadores de Liquidez
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <KPICard
                            title="Días de Cobro (DSO)"
                            value={liquidity.dso}
                            format="number"
                            icon={<Icons.UserCheck size={18} />}
                            color={liquidity.dso <= 30 ? 'emerald' : liquidity.dso <= 45 ? 'amber' : 'rose'}
                            subtitle={liquidity.dso <= 30 ? '✓ Ideal' : '⚠ Alto'}
                        />
                        <KPICard
                            title="Días de Pago (DPO)"
                            value={liquidity.dpo}
                            format="number"
                            icon={<Icons.CreditCard size={18} />}
                            color="slate"
                            subtitle={liquidity.dpo >= liquidity.dso ? '✓ Favorable' : '◦ Normal'}
                        />
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Icons.Package size={18} /> Indicadores de Inventario
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <KPICard
                            title="Rotación de Inventario"
                            value={inventory.inventoryTurnover}
                            format="number"
                            icon={<Icons.RefreshCw size={18} />}
                            color={inventory.inventoryTurnover >= 6 ? 'emerald' : 'amber'}
                            subtitle={`${inventory.daysOfInventory} días de stock`}
                        />
                        <KPICard
                            title="Valor de Inventario"
                            value={inventory.inventoryValue}
                            icon={<Icons.Database size={18} />}
                            color="blue"
                            subtitle={`${inventory.totalSKUs} productos, ${inventory.lowStockCount} bajo stock`}
                        />
                    </div>
                </div>
            </div>

            {/* Trend Chart & Sales Goal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Icons.Activity size={20} className="text-indigo-500" /> Tendencia Mensual
                    </h3>
                    <div className="flex gap-4 mb-4 text-xs">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Ingresos</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500 rounded-sm"></div> Costos</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-500 rounded-sm"></div> Utilidad</div>
                    </div>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorUtilidad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIngresos)" />
                                <Area type="monotone" dataKey="costos" stroke="#ef4444" strokeWidth={2} fillOpacity={0} />
                                <Area type="monotone" dataKey="utilidad" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorUtilidad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales Goal */}
                {salesGoal > 0 && <SalesGauge />}
                {salesGoal === 0 && (
                    <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-center">
                        <Icons.Target size={40} className="text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">Sin Meta Configurada</p>
                        <p className="text-gray-400 text-sm mt-1">Configura una meta de ventas para ver el progreso</p>
                    </div>
                )}
            </div>
        </div>
    );
};
