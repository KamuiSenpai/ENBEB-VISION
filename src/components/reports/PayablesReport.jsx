import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { Icons } from '../ui/Icons';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useData } from '../../context/DataContext';

export const PayablesReport = () => {
    const { suppliers, purchases } = useData();
    const [viewingSupplier, setViewingSupplier] = useState(null);

    // --- LOGIC: Calculate Payable Debt from Purchases ---
    const debtAnalysis = useMemo(() => {
        // 1. Filter Pending Purchases
        const pendingPurchases = purchases.filter(p => p.status === 'Pendiente');

        // 2. Group by Supplier
        const debtBySupplier = {};

        pendingPurchases.forEach(purchase => {
            const supplierId = purchase.supplierId;
            if (!supplierId) return;

            // If purchase doesn't have IGV calculated (legacy data), calculate it
            const hasIgv = purchase.igv !== undefined && purchase.igv !== null;
            const subtotal = hasIgv ? (purchase.subtotal || purchase.total / 1.18) : purchase.total;
            const igv = hasIgv ? purchase.igv : subtotal * 0.18;
            const totalWithIgv = hasIgv ? purchase.total : subtotal + igv;

            // Enrich purchase object with calculated values
            const enrichedPurchase = {
                ...purchase,
                subtotal,
                igv,
                totalWithIgv
            };

            if (!debtBySupplier[supplierId]) {
                debtBySupplier[supplierId] = {
                    bills: [],
                    totalDebt: 0
                };
            }

            debtBySupplier[supplierId].bills.push(enrichedPurchase);
            debtBySupplier[supplierId].totalDebt += totalWithIgv;
        });

        // 3. Map to Supplier Objects
        let grandTotal = 0;
        const supplierList = suppliers.map(supplier => {
            const data = debtBySupplier[supplier.id] || { bills: [], totalDebt: 0 };

            if (data.totalDebt > 0) grandTotal += data.totalDebt;

            let oldestDue = null;
            if (data.bills.length > 0) {
                const sorted = [...data.bills].sort((a, b) => {
                    const dateA = new Date(a.paymentDate || a.date); // Use paymentDate (due) or date
                    const dateB = new Date(b.paymentDate || b.date);
                    return dateA - dateB;
                });
                oldestDue = sorted[0].paymentDate || sorted[0].date;
            }

            return {
                ...supplier,
                pendingBills: data.bills,
                totalDebt: data.totalDebt,
                oldestDue,
                count: data.bills.length
            };
        }).filter(s => s.totalDebt > 0).sort((a, b) => b.totalDebt - a.totalDebt);

        return { suppliers: supplierList, grandTotal };
    }, [suppliers, purchases]);

    const getStatusBadge = (dueDateStr) => {
        if (!dueDateStr) return <span className="text-gray-500 text-[10px]">Sin Venc.</span>;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDateStr + 'T00:00:00');
        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return <span className="flex items-center justify-center gap-1 text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-bold"><Icons.Alert size={10} /> Vencido ({Math.abs(diffDays)}d)</span>;
        if (diffDays === 0) return <span className="text-white bg-red-500 border border-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">¡Vence Hoy!</span>;
        if (diffDays <= 3) return <span className="text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full text-[10px] font-bold">Vence en {diffDays}d</span>;
        return <span className="text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-bold">En {diffDays} días</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 flex flex-col md:flex-row justify-between items-center relative overflow-hidden gap-4">
                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Icons.Truck size={20} /></div>
                        Cuentas por Pagar (Proveedores)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 pl-11">Control de salidas de efectivo y obligaciones pendientes.</p>
                </div>
                <div className="text-right relative z-10 bg-red-50 px-6 py-2 rounded-xl border border-red-100">
                    <span className="block text-xs uppercase font-bold text-red-400 tracking-wide">Total por Pagar</span>
                    <span className="text-3xl font-bold text-red-600 tracking-tight">{formatCurrency(debtAnalysis.grandTotal)}</span>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-red-50/10 text-gray-500 border-b font-semibold uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-4">Proveedor</th>
                            <th className="p-4 text-center">Facturas Pendientes</th>
                            <th className="p-4 text-center">Próximo Vencimiento</th>
                            <th className="p-4 text-right">Monto Pendiente</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {debtAnalysis.suppliers.map(supplier => (
                            <tr key={supplier.id} className="hover:bg-red-50/10 transition-colors group">
                                <td className="p-4 font-medium text-gray-800">
                                    {supplier.name}
                                    <div className="text-xs text-gray-400">{supplier.phone || 'Sin contacto'}</div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold">{supplier.count} facturas</span>
                                </td>
                                <td className="p-4 text-center flex justify-center">
                                    {getStatusBadge(supplier.oldestDue)}
                                </td>
                                <td className="p-4 text-right font-bold text-gray-800 text-base">
                                    {formatCurrency(supplier.totalDebt)}
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => setViewingSupplier(supplier)}
                                        className="text-gray-600 hover:text-red-600 text-xs font-bold border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ml-auto"
                                    >
                                        <Icons.Eye size={14} /> Ver Facturas
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {debtAnalysis.suppliers.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="p-4 bg-blue-50 rounded-full text-blue-500"><Icons.Check size={32} /></div>
                                        <p className="font-medium text-gray-600">¡Sin Deudas!</p>
                                        <p className="text-sm">No hay facturas de proveedores pendientes de pago.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL (Portal) */}
            {viewingSupplier && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingSupplier(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden transform transition-all scale-100 animate-fade-inScale" onClick={e => e.stopPropagation()}>
                        <div className="bg-gray-900 p-6 text-white border-b flex justify-between items-start relative overflow-hidden">
                            <div className="relative z-10">
                                <h4 className="text-xl font-bold">{viewingSupplier.name}</h4>
                                <p className="text-gray-400 text-sm mt-1 flex items-center gap-2"><Icons.FileText size={14} /> Obligaciones pendientes</p>
                            </div>
                            <button onClick={() => setViewingSupplier(null)} className="p-2 hover:bg-white/20 rounded-lg transition relative z-10"><Icons.X size={20} className="text-white" /></button>
                            <div className="absolute -right-4 -top-4 opacity-10"><Icons.Truck size={100} /></div>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-0 bg-gray-50">
                            {viewingSupplier.pendingBills.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 text-xs uppercase text-gray-500 font-bold sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="p-4 text-left">Factura / Emisión</th>
                                            <th className="p-4 text-center">Vencimiento</th>
                                            <th className="p-4 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {viewingSupplier.pendingBills.map((bill, idx) => (
                                            <tr key={idx} className="hover:bg-red-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-700">{bill.invoiceNo || 'S/N'}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5">{formatDate(bill.date)}</div>
                                                </td>
                                                <td className="p-4 text-center">{getStatusBadge(bill.paymentDate || bill.date)}</td>
                                                <td className="p-4 text-right font-mono font-bold text-gray-800">{formatCurrency(bill.totalWithIgv)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-gray-500">Sin facturas pendientes.</div>
                            )}
                        </div>

                        <div className="p-5 bg-white border-t flex justify-between items-center shadow-[0_-5px_15px_rgba(0,0,0,0.05)] relative z-20">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total a Pagar</span>
                            <span className="text-2xl font-bold text-red-600">{formatCurrency(viewingSupplier.totalDebt)}</span>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
