import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { Icons } from '../ui/Icons';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useData } from '../../context/DataContext';

export const ReceivablesReport = () => {
    const { clients, sales } = useData();
    const [viewingClient, setViewingClient] = useState(null);

    // --- LOGIC: Calculate Debt from Sales with Aging Buckets ---
    const debtAnalysis = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Filter all Pending Sales
        const pendingSales = sales.filter(s => s.status === 'Pendiente');

        // 2. Group by Client AND calculate aging
        const debtByClient = {};
        const agingBuckets = {
            current: 0,      // Not yet due
            bucket_1_30: 0,  // 1-30 days overdue
            bucket_31_60: 0, // 31-60 days overdue
            bucket_61_90: 0, // 61-90 days overdue
            bucket_90_plus: 0 // 90+ days overdue
        };

        pendingSales.forEach(sale => {
            const clientId = sale.clientId;
            if (!clientId) return; // Skip if no client attached

            // Calculate days overdue
            const dueDate = new Date((sale.dueDate || sale.date) + 'T00:00:00');
            const diffDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));

            // Assign to aging bucket
            if (diffDays <= 0) {
                agingBuckets.current += sale.total;
            } else if (diffDays <= 30) {
                agingBuckets.bucket_1_30 += sale.total;
            } else if (diffDays <= 60) {
                agingBuckets.bucket_31_60 += sale.total;
            } else if (diffDays <= 90) {
                agingBuckets.bucket_61_90 += sale.total;
            } else {
                agingBuckets.bucket_90_plus += sale.total;
            }

            if (!debtByClient[clientId]) {
                debtByClient[clientId] = {
                    invoices: [],
                    totalDebt: 0,
                    maxDaysOverdue: 0
                };
            }

            debtByClient[clientId].invoices.push({ ...sale, daysOverdue: diffDays });
            debtByClient[clientId].totalDebt += sale.total;
            if (diffDays > debtByClient[clientId].maxDaysOverdue) {
                debtByClient[clientId].maxDaysOverdue = diffDays;
            }
        });

        // 3. Map to Client Objects
        let grandTotal = 0;
        const clientList = clients.map(client => {
            const data = debtByClient[client.id] || { invoices: [], totalDebt: 0, maxDaysOverdue: 0 };

            if (data.totalDebt > 0) grandTotal += data.totalDebt;

            // Find oldest due date
            let oldestDue = null;
            if (data.invoices.length > 0) {
                // Sort invoices by due date if available, else by sale date
                const sorted = [...data.invoices].sort((a, b) => {
                    const dateA = new Date(a.dueDate || a.date);
                    const dateB = new Date(b.dueDate || b.date);
                    return dateA - dateB;
                });
                oldestDue = sorted[0].dueDate || sorted[0].date;
            }

            return {
                ...client,
                pendingInvoices: data.invoices,
                totalDebt: data.totalDebt,
                maxDaysOverdue: data.maxDaysOverdue,
                oldestDue,
                count: data.invoices.length
            };
        }).filter(c => c.totalDebt > 0).sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue); // Sort by most overdue first

        return { clients: clientList, grandTotal, agingBuckets };
    }, [clients, sales]);

    // Helper for Status Badge
    const getStatusBadge = (dueDateStr) => {
        if (!dueDateStr) return <span className="text-gray-500 text-[10px]">Sin Venc.</span>;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Fix timezone offset for comparison if needed, but simple Date(str) usually works for YYYY-MM-DD in local time if formatted right
        // Let's assume input is YYYY-MM-DD
        const due = new Date(dueDateStr + 'T00:00:00');
        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return <span className="flex items-center justify-center gap-1 text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full text-[10px] font-bold"><Icons.Alert size={10} /> Vencido ({Math.abs(diffDays)}d)</span>;
        if (diffDays <= 3) return <span className="text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full text-[10px] font-bold">Vence pronto ({diffDays}d)</span>;
        return <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold">Al día ({diffDays}d)</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* AGING BUCKETS DASHBOARD */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Current (Not Due) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 group hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-emerald-600 uppercase">Al Día</span>
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(debtAnalysis.agingBuckets.current)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">No vencido aún</p>
                </div>

                {/* 1-30 Days */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-100 group hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-yellow-600 uppercase">1-30 Días</span>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(debtAnalysis.agingBuckets.bucket_1_30)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">Vencido reciente</p>
                </div>

                {/* 31-60 Days */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 group hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-orange-600 uppercase">31-60 Días</span>
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(debtAnalysis.agingBuckets.bucket_31_60)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">En seguimiento</p>
                </div>

                {/* 61-90 Days */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 group hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-red-500 uppercase">61-90 Días</span>
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(debtAnalysis.agingBuckets.bucket_61_90)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">Alto riesgo</p>
                </div>

                {/* 90+ Days */}
                <div className="bg-gradient-to-br from-red-600 to-red-700 text-white p-4 rounded-xl shadow-lg group hover:shadow-xl transition-all relative overflow-hidden">
                    <div className="flex justify-between items-center mb-2 relative z-10">
                        <span className="text-xs font-bold uppercase opacity-80">+90 Días</span>
                        <Icons.Alert size={16} className="animate-pulse" />
                    </div>
                    <p className="text-2xl font-bold relative z-10">{formatCurrency(debtAnalysis.agingBuckets.bucket_90_plus)}</p>
                    <p className="text-[10px] opacity-70 mt-1 relative z-10">Incobrable / Crítico</p>
                    <div className="absolute -right-4 -bottom-4 opacity-10"><Icons.Alert size={80} /></div>
                </div>
            </div>

            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 flex flex-col md:flex-row justify-between items-center relative overflow-hidden gap-4">
                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Icons.UserCheck size={20} /></div>
                        Cartera de Clientes (Cuentas por Cobrar)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 pl-11">Monitor de riesgo crediticio y antigüedad de deuda.</p>
                </div>
                <div className="text-right relative z-10 bg-orange-50 px-6 py-2 rounded-xl border border-orange-100">
                    <span className="block text-xs uppercase font-bold text-orange-400 tracking-wide">Deuda Total Activa</span>
                    <span className="text-3xl font-bold text-orange-600 tracking-tight">{formatCurrency(debtAnalysis.grandTotal)}</span>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-orange-50/10 text-gray-500 border-b font-semibold uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-4">Cliente</th>
                            <th className="p-4 text-center">Facturas Pendientes</th>
                            <th className="p-4 text-center">Vencimiento (Más Antiguo)</th>
                            <th className="p-4 text-right">Total Deuda</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {debtAnalysis.clients.map(client => (
                            <tr key={client.id} className="hover:bg-orange-50/10 transition-colors group">
                                <td className="p-4 font-medium text-gray-800">
                                    {client.name}
                                    <div className="text-xs text-gray-400">{client.email || 'Sin contacto'}</div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">{client.count} facturas</span>
                                </td>
                                <td className="p-4 text-center flex justify-center">
                                    {getStatusBadge(client.oldestDue)}
                                </td>
                                <td className="p-4 text-right font-bold text-gray-800 text-base">
                                    {formatCurrency(client.totalDebt)}
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => setViewingClient(client)}
                                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold border border-indigo-100 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ml-auto"
                                    >
                                        <Icons.Eye size={14} /> Ver Detalle
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {debtAnalysis.clients.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="p-4 bg-emerald-50 rounded-full text-emerald-500"><Icons.Check size={32} /></div>
                                        <p className="font-medium text-gray-600">¡Todo al día!</p>
                                        <p className="text-sm">No hay clientes con deuda pendiente.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL DETAIL (Portal) */}
            {viewingClient && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingClient(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden transform transition-all scale-100 animate-fade-inScale" onClick={e => e.stopPropagation()}>
                        <div className="bg-gray-900 p-6 text-white border-b flex justify-between items-start relative overflow-hidden">
                            <div className="relative z-10">
                                <h4 className="text-xl font-bold">{viewingClient.name}</h4>
                                <p className="text-gray-400 text-sm mt-1 flex items-center gap-2"><Icons.FileText size={14} /> Detalle de facturas pendientes</p>
                            </div>
                            <button onClick={() => setViewingClient(null)} className="p-2 hover:bg-white/20 rounded-lg transition relative z-10"><Icons.X size={20} className="text-white" /></button>

                            {/* Decor */}
                            <div className="absolute -right-4 -top-4 opacity-10"><Icons.Wallet size={100} /></div>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto p-0 bg-gray-50">
                            {viewingClient.pendingInvoices.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 text-xs uppercase text-gray-500 font-bold sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="p-4 text-left">Emisión</th>
                                            <th className="p-4 text-center">Vencimiento</th>
                                            <th className="p-4 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {viewingClient.pendingInvoices.map((inv, idx) => (
                                            <tr key={idx} className="hover:bg-indigo-50 transition-colors">
                                                <td className="p-4 text-gray-700">
                                                    <div className="font-bold">{formatDate(inv.date)}</div>
                                                    {inv.invoiceNo && <div className="text-xs text-gray-400 font-mono mt-0.5">{inv.invoiceNo}</div>}
                                                </td>
                                                <td className="p-4 text-center">{getStatusBadge(inv.dueDate)}</td>
                                                <td className="p-4 text-right font-mono font-bold text-gray-800">{formatCurrency(inv.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-gray-500">Sin facturas pendientes.</div>
                            )}
                        </div>

                        <div className="p-5 bg-white border-t flex justify-between items-center shadow-[0_-5px_15px_rgba(0,0,0,0.05)] relative z-20">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Deuda Acumulada</span>
                            <span className="text-2xl font-bold text-orange-600">{formatCurrency(viewingClient.totalDebt)}</span>
                        </div>

                        <div className="bg-gray-50 p-3 text-center border-t border-gray-100 text-xs text-gray-400">
                            <Icons.Alert size={12} className="inline mr-1 mb-0.5" />
                            Revise los vencimientos antes de aprobar nuevos créditos.
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
