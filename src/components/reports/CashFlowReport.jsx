import React, { useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useData } from '../../context/DataContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

export const CashFlowReport = () => {
    const { sales, purchases } = useData();

    // --- LOGIC: Calculate 30-Day Cash Flow Projection ---
    const projection = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Generate next 30 days
        const daysData = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            daysData.push({
                date: date.toISOString().split('T')[0],
                dateLabel: date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
                inflows: 0,
                outflows: 0,
                net: 0,
                cumulativeNet: 0
            });
        }

        // Map date strings to index for quick lookup
        const dateIndex = {};
        daysData.forEach((d, i) => dateIndex[d.date] = i);

        // Calculate Expected Inflows (Pending Sales by Due Date)
        const pendingSales = sales.filter(s => s.status === 'Pendiente');
        pendingSales.forEach(sale => {
            const dueDate = sale.dueDate || sale.date;
            if (dateIndex[dueDate] !== undefined) {
                daysData[dateIndex[dueDate]].inflows += sale.total;
            }
        });

        // Calculate Expected Outflows (Pending Purchases by Due Date)
        const pendingPurchases = purchases.filter(p => p.status === 'Pendiente');
        pendingPurchases.forEach(purchase => {
            const dueDate = purchase.dueDate || purchase.date;
            if (dateIndex[dueDate] !== undefined) {
                daysData[dateIndex[dueDate]].outflows += purchase.total;
            }
        });

        // Calculate Net and Cumulative Net
        let cumulative = 0;
        daysData.forEach(day => {
            day.net = day.inflows - day.outflows;
            cumulative += day.net;
            day.cumulativeNet = cumulative;
        });

        // Summary Stats
        const totalInflows = daysData.reduce((acc, d) => acc + d.inflows, 0);
        const totalOutflows = daysData.reduce((acc, d) => acc + d.outflows, 0);
        const netFlow = totalInflows - totalOutflows;

        // Find critical days (where cumulative goes negative)
        const criticalDays = daysData.filter(d => d.cumulativeNet < 0);

        return { daysData, totalInflows, totalOutflows, netFlow, criticalDays };
    }, [sales, purchases]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Expected Inflows */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Icons.TrendingUp size={20} /></div>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">30 Días</span>
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Ingresos Esperados</p>
                    <h3 className="text-3xl font-bold text-emerald-600 mt-1">{formatCurrency(projection.totalInflows)}</h3>
                    <p className="text-xs text-gray-400 mt-2">Cobros por vencer en los próximos 30 días</p>
                </div>

                {/* Expected Outflows */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Icons.ArrowDown size={20} /></div>
                        <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-bold">30 Días</span>
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Egresos Esperados</p>
                    <h3 className="text-3xl font-bold text-rose-600 mt-1">{formatCurrency(projection.totalOutflows)}</h3>
                    <p className="text-xs text-gray-400 mt-2">Pagos a proveedores por realizar</p>
                </div>

                {/* Net Flow */}
                <div className={`p-6 rounded-2xl shadow-sm border relative overflow-hidden group hover:shadow-md transition-all ${projection.netFlow >= 0 ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-700' : 'bg-gradient-to-br from-rose-600 to-rose-700 text-white border-rose-700'}`}>
                    <div className="flex justify-between items-start mb-3">
                        <div className={`p-2 rounded-lg ${projection.netFlow >= 0 ? 'bg-white/20' : 'bg-white/20'}`}>
                            {projection.netFlow >= 0 ? <Icons.Check size={20} /> : <Icons.Alert size={20} />}
                        </div>
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-bold">{projection.netFlow >= 0 ? 'Positivo' : 'Déficit'}</span>
                    </div>
                    <p className="opacity-80 text-xs font-bold uppercase tracking-wider">Flujo Neto</p>
                    <h3 className="text-3xl font-bold mt-1">{formatCurrency(projection.netFlow)}</h3>
                    {projection.criticalDays.length > 0 && (
                        <p className="text-xs mt-2 opacity-80">
                            <Icons.Alert size={12} className="inline mr-1" />
                            {projection.criticalDays.length} días con saldo negativo proyectado
                        </p>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Icons.Activity className="text-indigo-500" size={20} /> Proyección de Flujo de Caja (30 Días)
                    </h3>
                    <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Ingresos</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500 rounded-sm"></div> Egresos</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-500 rounded-sm"></div> Neto Acumulado</div>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projection.daysData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorInflows" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorOutflows" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `S/ ${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '12px' }}
                                formatter={(value, name) => [formatCurrency(value), name === 'inflows' ? 'Ingresos' : name === 'outflows' ? 'Egresos' : 'Acumulado']}
                                labelFormatter={(label) => `Fecha: ${label}`}
                            />
                            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                            <Area type="monotone" dataKey="inflows" name="Ingresos" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInflows)" />
                            <Area type="monotone" dataKey="outflows" name="Egresos" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOutflows)" />
                            <Area type="monotone" dataKey="cumulativeNet" name="Acumulado" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Critical Days Warning */}
            {projection.criticalDays.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-4">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><Icons.Alert size={20} /></div>
                    <div>
                        <h4 className="font-bold text-rose-800">Alerta de Liquidez</h4>
                        <p className="text-sm text-rose-700 mt-1">
                            Se proyecta un saldo negativo en las siguientes fechas. Considera acelerar cobranzas o diferir pagos:
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {projection.criticalDays.slice(0, 5).map(day => (
                                <span key={day.date} className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold">
                                    {day.dateLabel} ({formatCurrency(day.cumulativeNet)})
                                </span>
                            ))}
                            {projection.criticalDays.length > 5 && (
                                <span className="bg-rose-200 text-rose-800 px-3 py-1 rounded-full text-xs font-bold">
                                    +{projection.criticalDays.length - 5} más
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
