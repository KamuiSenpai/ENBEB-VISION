import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { Icons } from '../ui/Icons';
import { formatCurrency } from '../../lib/utils';
import { useData } from '../../context/DataContext';
import {
    calculateIncomeStatement,
    calculateRealCashFlow,
    calculateLiquidityKPIs,
    getDateRange,
    filterByDateRange,
    generateWaterfallData
} from '../../lib/analytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

export const FinancialStatements = ({ period = 'month', referenceDate = new Date() }) => {
    const { sales, purchases, expenses } = useData();
    const [activeTab, setActiveTab] = useState('pnl');

    // Filter data by period
    const { start, end } = useMemo(() => getDateRange(period, referenceDate), [period, referenceDate]);

    const filteredSales = useMemo(() => filterByDateRange(sales, start, end), [sales, start, end]);
    const filteredPurchases = useMemo(() => filterByDateRange(purchases, start, end), [purchases, start, end]);
    const filteredExpenses = useMemo(() => filterByDateRange(expenses, start, end), [expenses, start, end]);

    // Calculate statements
    const incomeStatement = useMemo(() =>
        calculateIncomeStatement(filteredSales, filteredPurchases, filteredExpenses),
        [filteredSales, filteredPurchases, filteredExpenses]
    );

    const cashFlow = useMemo(() =>
        calculateRealCashFlow(filteredSales, filteredPurchases, filteredExpenses),
        [filteredSales, filteredPurchases, filteredExpenses]
    );

    const liquidity = useMemo(() =>
        calculateLiquidityKPIs(sales, purchases, 30),
        [sales, purchases]
    );

    // Waterfall chart data
    const waterfallData = useMemo(() => generateWaterfallData(incomeStatement), [incomeStatement]);

    const tabs = [
        { id: 'pnl', label: 'Estado de Resultados', icon: <Icons.FileText size={16} /> },
        { id: 'cashflow', label: 'Flujo de Caja', icon: <Icons.DollarSign size={16} /> },
        { id: 'balance', label: 'Balance', icon: <Icons.Scale size={16} /> }
    ];

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-xl p-1 shadow-sm border border-gray-100 inline-flex gap-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* P&L Tab */}
            {activeTab === 'pnl' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Icons.FileText size={20} /> Estado de Resultados
                            </h3>
                            <p className="text-indigo-200 text-sm mt-1">{filteredSales.length} transacciones en el período</p>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="p-4 font-medium text-gray-700">Ingresos Brutos (sin IGV)</td>
                                        <td className="p-4 text-right font-bold text-emerald-600">{formatCurrency(incomeStatement.grossRevenue)}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <td className="p-4 text-gray-500 pl-8">(-) Costo de Ventas</td>
                                        <td className="p-4 text-right text-red-500">({formatCurrency(incomeStatement.costOfGoodsSold)})</td>
                                    </tr>
                                    <tr className="border-b-2 border-gray-200 bg-blue-50">
                                        <td className="p-4 font-bold text-blue-800">= Utilidad Bruta</td>
                                        <td className="p-4 text-right font-bold text-blue-600">
                                            {formatCurrency(incomeStatement.grossProfit)}
                                            <span className="text-xs ml-2 text-blue-400">({incomeStatement.grossMargin.toFixed(1)}%)</span>
                                        </td>
                                    </tr>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <td className="p-4 text-gray-500 pl-8">(-) Gastos Operativos</td>
                                        <td className="p-4 text-right text-orange-500">({formatCurrency(incomeStatement.operatingExpenses)})</td>
                                    </tr>
                                    <tr className="border-b-2 border-purple-200 bg-purple-50">
                                        <td className="p-4 font-bold text-purple-800 text-lg">= EBITDA</td>
                                        <td className="p-4 text-right font-bold text-purple-600 text-lg">
                                            {formatCurrency(incomeStatement.ebitda)}
                                            <span className="text-xs ml-2 text-purple-400">({incomeStatement.ebitdaMargin.toFixed(1)}%)</span>
                                        </td>
                                    </tr>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <td className="p-4 text-gray-500 pl-8">(-) Impuesto a la Renta (1.5% MYPE)</td>
                                        <td className="p-4 text-right text-gray-500">({formatCurrency(incomeStatement.incomeTax)})</td>
                                    </tr>
                                    <tr className="bg-gradient-to-r from-emerald-50 to-teal-50">
                                        <td className="p-5 font-bold text-emerald-800 text-lg">= UTILIDAD NETA</td>
                                        <td className="p-5 text-right font-bold text-emerald-600 text-2xl">
                                            {formatCurrency(incomeStatement.netIncome)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Waterfall Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Icons.BarChart2 size={20} className="text-indigo-500" /> Análisis Visual P&L
                        </h3>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={waterfallData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <XAxis type="number" tickFormatter={(v) => `S/ ${(v / 1000).toFixed(0)}k`} />
                                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(value) => formatCurrency(Math.abs(value))} />
                                    <ReferenceLine x={0} stroke="#94a3b8" />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {waterfallData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Flow Tab */}
            {activeTab === 'cashflow' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Inflows */}
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-white/20 rounded-xl"><Icons.ArrowDownLeft size={24} /></div>
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Cobros Realizados</p>
                                <p className="text-3xl font-bold">{formatCurrency(cashFlow.inflows)}</p>
                            </div>
                        </div>
                        <div className="text-emerald-100 text-sm">{cashFlow.inflowsCount} ventas cobradas</div>
                    </div>

                    {/* Outflows */}
                    <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg shadow-rose-500/20">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-white/20 rounded-xl"><Icons.ArrowUpRight size={24} /></div>
                            <div>
                                <p className="text-rose-100 text-sm font-medium">Pagos Realizados</p>
                                <p className="text-3xl font-bold">{formatCurrency(cashFlow.totalOutflows)}</p>
                            </div>
                        </div>
                        <div className="flex justify-between text-rose-100 text-sm">
                            <span>Proveedores: {formatCurrency(cashFlow.outflowsPurchases)}</span>
                            <span>Gastos: {formatCurrency(cashFlow.outflowsExpenses)}</span>
                        </div>
                    </div>

                    {/* Net */}
                    <div className={`rounded-2xl p-6 text-white shadow-lg ${cashFlow.netCashFlow >= 0
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20'
                        : 'bg-gradient-to-br from-gray-700 to-gray-800 shadow-gray-700/20'
                        }`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                {cashFlow.netCashFlow >= 0 ? <Icons.TrendingUp size={24} /> : <Icons.TrendingDown size={24} />}
                            </div>
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Flujo Neto</p>
                                <p className="text-3xl font-bold">{formatCurrency(cashFlow.netCashFlow)}</p>
                            </div>
                        </div>
                        <div className="text-blue-100 text-sm">
                            {cashFlow.netCashFlow >= 0 ? '✓ Flujo positivo' : '⚠ Flujo negativo'}
                        </div>
                    </div>

                    {/* Pending Summary */}
                    <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Icons.Clock size={20} className="text-amber-500" /> Pendientes de Cobro/Pago
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <p className="text-amber-600 text-xs font-bold uppercase">Por Cobrar</p>
                                <p className="text-2xl font-bold text-amber-700">{formatCurrency(liquidity.accountsReceivable)}</p>
                                <p className="text-xs text-amber-500 mt-1">DSO: {liquidity.dso} días</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <p className="text-red-600 text-xs font-bold uppercase">Por Pagar</p>
                                <p className="text-2xl font-bold text-red-700">{formatCurrency(liquidity.accountsPayable)}</p>
                                <p className="text-xs text-red-500 mt-1">DPO: {liquidity.dpo} días</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <p className="text-blue-600 text-xs font-bold uppercase">Capital de Trabajo</p>
                                <p className={`text-2xl font-bold ${liquidity.workingCapital >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                    {formatCurrency(liquidity.workingCapital)}
                                </p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <p className="text-purple-600 text-xs font-bold uppercase">Ciclo de Caja</p>
                                <p className={`text-2xl font-bold ${liquidity.cashConversionCycle <= 30 ? 'text-purple-700' : 'text-orange-700'}`}>
                                    {liquidity.cashConversionCycle} días
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Balance Tab */}
            {activeTab === 'balance' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-5 text-white">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Icons.Scale size={20} /> Balance Simplificado
                        </h3>
                        <p className="text-slate-300 text-sm mt-1">Vista resumida de activos y pasivos</p>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-200">
                        {/* Activos */}
                        <div className="p-6">
                            <h4 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div> ACTIVOS
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Efectivo Recibido</span>
                                    <span className="font-bold text-emerald-600">{formatCurrency(cashFlow.inflows)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Cuentas por Cobrar</span>
                                    <span className="font-bold text-amber-600">{formatCurrency(liquidity.accountsReceivable)}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between">
                                    <span className="font-bold text-gray-800">Total Activos</span>
                                    <span className="font-bold text-gray-800 text-lg">
                                        {formatCurrency(cashFlow.inflows + liquidity.accountsReceivable)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Pasivos */}
                        <div className="p-6">
                            <h4 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div> PASIVOS + PATRIMONIO
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Cuentas por Pagar</span>
                                    <span className="font-bold text-red-600">{formatCurrency(liquidity.accountsPayable)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <span className="text-emerald-700">Utilidad del Período</span>
                                    <span className="font-bold text-emerald-600">{formatCurrency(incomeStatement.netIncome)}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between">
                                    <span className="font-bold text-gray-800">Total Pasivo + Patrimonio</span>
                                    <span className="font-bold text-gray-800 text-lg">
                                        {formatCurrency(liquidity.accountsPayable + incomeStatement.netIncome)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
