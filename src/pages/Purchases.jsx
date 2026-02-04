import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/ui/Icons';
import { SmartProductSelect } from '../components/shared/SmartProductSelect';
import { formatCurrency, formatDate, calculatePaymentDate } from '../lib/utils';
import { db, appId } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, increment, arrayUnion, getDoc } from 'firebase/firestore';

export const Purchases = () => {
    const { products, suppliers, purchases, showNotification } = useData();
    const { user } = useAuth();

    // --- STATES ---
    // Filters
    const [filterSupplier, setFilterSupplier] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    // Form
    const [view, setView] = useState('list'); // 'list' | 'form'
    const [editingId, setEditingId] = useState(null);

    // Header Data
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNo, setInvoiceNo] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [status, setStatus] = useState('Pendiente'); // 'Pendiente' | 'Pagado'

    // Items Data
    const [items, setItems] = useState([]);
    const [originalItems, setOriginalItems] = useState([]); // For rollback during edit

    // Item Input
    const [currentProdId, setCurrentProdId] = useState('');
    const [qty, setQty] = useState(1);
    const [cost, setCost] = useState('');

    // UI
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [preview, setPreview] = useState(null);

    // Constants
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const years = [2023, 2024, 2025, 2026];

    // --- CALCULATIONS ---
    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
    const igv = subtotal * 0.18;
    const grandTotal = subtotal + igv;

    // --- EFFECTS ---
    // Auto-calculate suggested payment date
    useEffect(() => {
        if (!paymentDate && purchaseDate) {
            setPaymentDate(calculatePaymentDate(purchaseDate));
        }
    }, [purchaseDate]);

    // --- ACTIONS ---

    const resetForm = () => {
        setEditingId(null);
        setSelectedSupplier('');
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setInvoiceNo('');
        setPaymentDate('');
        setStatus('Pendiente');
        setItems([]);
        setOriginalItems([]);
        setQty(1);
        setCost('');
        setCurrentProdId('');
        setView('list');
    };

    const handleEdit = (purchase) => {
        setEditingId(purchase.id);
        setSelectedSupplier(purchase.supplierId);
        setPurchaseDate(purchase.date);
        setInvoiceNo(purchase.invoiceNo);
        setPaymentDate(purchase.paymentDate || calculatePaymentDate(purchase.date));
        setStatus(purchase.status || 'Pendiente');
        setItems(purchase.items || []);
        setOriginalItems(purchase.items || []); // Keep copy for rollback
        setView('form');
    };

    const addItem = () => {
        const prod = products.find(p => p.id === currentProdId);
        if (!prod) return;
        if (qty <= 0) { showNotification("Cantidad inválida", "error"); return; }
        if (!cost || parseFloat(cost) < 0) { showNotification("Costo inválido", "error"); return; }

        const costVal = parseFloat(cost);

        setItems([...items, {
            productId: prod.id,
            productName: prod.name,
            qty: qty,
            cost: costVal,
            subtotal: qty * costVal
        }]);

        // Reset inputs
        setQty(1);
        setCost('');
        setCurrentProdId('');
    };

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleSave = async () => {
        if (!selectedSupplier || items.length === 0) {
            showNotification("Complete proveedor e items.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const supplierName = suppliers.find(s => s.id === selectedSupplier)?.name || 'Desconocido';
            const timestamp = new Date().toISOString();

            const purchaseData = {
                date: purchaseDate,
                supplierId: selectedSupplier,
                supplierName,
                invoiceNo,
                paymentDate,
                status,
                items,
                subtotal,
                igv,
                total: grandTotal,
                updatedAt: Timestamp.now()
            };

            if (editingId) {
                // --- UPDATE LOGIC ---
                // 1. Revert Old Stock
                for (const item of originalItems) {
                    const prodRef = doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.productId);
                    const prodSnap = await getDoc(prodRef);
                    if (prodSnap.exists()) {
                        await updateDoc(prodRef, {
                            stock: increment(-item.qty)
                        });
                    }
                }

                // 2. Add New Stock
                for (const item of items) {
                    const prodRef = doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.productId);
                    const prodSnap = await getDoc(prodRef);
                    if (prodSnap.exists()) {
                        const currentStock = prodSnap.data().stock || 0;
                        const currentCost = prodSnap.data().cost || 0;
                        const newStock = currentStock + item.qty;
                        // Simplified WAC update (approximate as we don't have perfect history)
                        const newCost = newStock > 0 ? ((currentStock * currentCost) + (item.qty * item.cost)) / newStock : item.cost;

                        await updateDoc(prodRef, {
                            stock: increment(item.qty),
                            cost: newCost
                        });
                    }
                }

                // 3. Update Purchase Doc
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'purchases', editingId), purchaseData);
                showNotification("Compra actualizada correctamente.", "success");

            } else {
                // --- CREATE LOGIC ---
                purchaseData.createdAt = Timestamp.now();

                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'purchases'), purchaseData);

                // Update Stock & Cost
                for (const item of items) {
                    const prod = products.find(p => p.id === item.productId);
                    if (prod) {
                        const currentStock = prod.stock || 0;
                        const currentCost = prod.cost || 0;
                        const newStock = currentStock + item.qty;
                        const newCost = ((currentStock * currentCost) + (item.qty * item.cost)) / newStock;

                        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.productId), {
                            stock: increment(item.qty),
                            cost: newCost,
                            priceHistory: arrayUnion({
                                date: timestamp,
                                cost: item.cost,
                                price: prod.price,
                                source: 'Compra',
                                note: `Fac. ${invoiceNo}`,
                                type: 'purchase'
                            })
                        });
                    }
                }
                showNotification("Compra registrada exitosamente.", "success");
            }

            resetForm();

        } catch (error) {
            console.error(error);
            showNotification("Error al guardar la compra.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (p) => {
        if (!window.confirm(`¿Estás seguro de eliminar la compra ${p.invoiceNo}? Se descontará el stock.`)) return;

        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'purchases', p.id));

            // Revert Stock
            for (const item of p.items) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.productId), {
                    stock: increment(-item.qty)
                });
            }
            showNotification("Compra eliminada.", "success");
        } catch (e) {
            showNotification("Error al eliminar.", "error");
        }
    };

    const toggleStatus = async (p) => {
        const newStatus = p.status === 'Pagado' ? 'Pendiente' : 'Pagado';
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'purchases', p.id), {
                status: newStatus
            });
            showNotification(`Estado cambiado a ${newStatus}`, "success");
        } catch (e) {
            showNotification("Error al cambiar estado", "error");
        }
    };

    // --- FILTRATION ---
    const filteredPurchases = useMemo(() => {
        return purchases.filter(p => {
            const pDate = new Date(p.date + 'T00:00:00'); // Fix timezone issues

            // Date Filter
            const matchMonth = filterMonth === 'all' ? true : pDate.getMonth() === parseInt(filterMonth);
            const matchYear = filterYear === 'all' ? true : pDate.getFullYear() === parseInt(filterYear);

            // Supplier Filter
            const matchSupplier = filterSupplier ? p.supplierId === filterSupplier : true;

            // Status Filter
            const currentStatus = p.status || 'Pendiente';
            const matchStatus = filterStatus === 'all' ? true : currentStatus === filterStatus;

            return matchMonth && matchYear && matchSupplier && matchStatus;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [purchases, filterMonth, filterYear, filterSupplier, filterStatus]);

    const totalFiltered = filteredPurchases.reduce((acc, p) => acc + p.total, 0);

    return (
        <div className="space-y-6 animate-fade-in relative pb-10">

            {/* --- LIST VIEW --- */}
            {view === 'list' && (
                <>
                    {/* Header & Stats */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Gestión de Compras</h2>
                            <p className="text-gray-500 text-sm">Registro y control de proveedores e inventario.</p>
                        </div>
                        <button onClick={() => setView('form')} className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-600/20 flex items-center transition-all transform hover:-translate-y-0.5">
                            <Icons.Plus size={20} className="mr-2" /> Nueva Compra
                        </button>
                    </div>

                    {/* Filters Bar */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex flex-wrap gap-3 flex-1">
                            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-orange-500">
                                <option value="all">Todo el año</option>
                                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-orange-500">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-orange-500 min-w-[200px]">
                                <option value="">Todos los Proveedores</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-orange-500">
                                <option value="all">Estado: Todos</option>
                                <option value="Pendiente">Pendientes</option>
                                <option value="Pagado">Pagados</option>
                            </select>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-400 uppercase font-bold">Total Período</div>
                            <div className="text-xl font-bold text-gray-800">{formatCurrency(totalFiltered)}</div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 text-gray-500 border-b font-semibold uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Proveedor</th>
                                    <th className="p-4">Doc. Ref</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-right">Total</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredPurchases.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4 text-gray-600">{formatDate(p.date)}</td>
                                        <td className="p-4 font-medium text-gray-800">{p.supplierName}</td>
                                        <td className="p-4 font-mono text-xs text-gray-500 bg-gray-50 inline-block rounded m-4 px-2 py-1">{p.invoiceNo || 'S/N'}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${!p.status || p.status === 'Pendiente' ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                                                {p.status || 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-bold text-gray-800">{formatCurrency(p.total)}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setPreview(p)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Ver Detalle"><Icons.Eye size={18} /></button>
                                                <button onClick={() => toggleStatus(p)} className={`p-1.5 rounded-lg transition ${p.status === 'Pagado' ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`} title={p.status === 'Pagado' ? 'Marcar Pendiente' : 'Marcar Pagado'}>
                                                    {p.status === 'Pagado' ? <Icons.Clock size={18} /> : <Icons.Check size={18} />}
                                                </button>
                                                <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar"><Icons.Edit size={18} /></button>
                                                <button onClick={() => handleDelete(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar"><Icons.Trash size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPurchases.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-gray-400 italic">No tienes compras registradas en este período.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* --- FORM VIEW --- */}
            {view === 'form' && (
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center">
                            <button onClick={resetForm} className="mr-4 text-gray-400 hover:text-gray-600 transition"><Icons.ArrowDown className="transform rotate-90" size={24} /></button>
                            {editingId ? 'Editar Compra' : 'Registrar Nueva Compra'}
                        </h2>
                        {editingId && <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">Modo Edición</span>}
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Header Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Proveedor <span className="text-red-500">*</span></label>
                                <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">Seleccionar Proveedor...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nº Factura</label>
                                <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="F001-000..." className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado Pago</label>
                                <select value={status} onChange={e => setStatus(e.target.value)} className={`w-full border rounded-lg p-2.5 text-sm font-bold outline-none ${status === 'Pagado' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Pagado">Pagado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha Emisión</label>
                                <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha Pago (Venc.)</label>
                                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Icons.Package size={18} /> Detalle de Productos</h3>

                            {/* Add Item Bar */}
                            <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
                                <div className="flex-1 w-full">
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">BUSCAR PRODUCTO</label>
                                    <SmartProductSelect products={products} value={currentProdId} onChange={setCurrentProdId} />
                                </div>
                                <div className="w-full md:w-32">
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">CANTIDAD</label>
                                    <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="w-full border border-gray-300 rounded-lg p-2 text-center font-bold" />
                                </div>
                                <div className="w-full md:w-40">
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">COSTO UNIT.</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-400 sm:text-sm">S/</span>
                                        <input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 pl-8 font-mono" placeholder="0.00" />
                                    </div>
                                </div>
                                <button onClick={addItem} className="w-full md:w-auto bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center transition">
                                    <Icons.Plus size={20} /> <span className="ml-2 md:hidden">Agregar</span>
                                </button>
                            </div>

                            {/* Items Table */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 text-gray-500 text-xs uppercase">
                                        <tr>
                                            <th className="p-3 text-left">Producto</th>
                                            <th className="p-3 text-center">Cant</th>
                                            <th className="p-3 text-right">Costo U.</th>
                                            <th className="p-3 text-right">Subtotal</th>
                                            <th className="p-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-3 font-medium text-gray-700">{item.productName}</td>
                                                <td className="p-3 text-center text-gray-600 bg-gray-50 font-mono text-xs">{item.qty}</td>
                                                <td className="p-3 text-right text-gray-600">{formatCurrency(item.cost)}</td>
                                                <td className="p-3 text-right font-bold text-gray-800">{formatCurrency(item.subtotal)}</td>
                                                <td className="p-3">
                                                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 transition"><Icons.Trash size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {items.length === 0 && (
                                            <tr><td colSpan="5" className="p-6 text-center text-gray-400 text-xs italic">Agrega productos a la compra...</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex flex-col items-end mt-4 gap-1 border-t pt-4">
                                <div className="flex justify-between w-48 text-sm">
                                    <span className="text-gray-500">Subtotal:</span>
                                    <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between w-48 text-sm">
                                    <span className="text-gray-500">IGV (18%):</span>
                                    <span className="font-medium text-gray-700">{formatCurrency(igv)}</span>
                                </div>
                                <div className="flex justify-between w-48 text-base border-t pt-2 mt-1">
                                    <span className="font-bold text-gray-600">Total:</span>
                                    <span className="text-xl font-bold text-gray-800">{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-gray-50 p-6 border-t flex gap-4">
                        <button onClick={resetForm} className="w-1/3 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-100 transition">Cancelar</button>
                        <button onClick={handleSave} disabled={isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-600/20 transition disabled:opacity-50 flex justify-center items-center">
                            {isSubmitting ? (
                                <span className="loader mr-2"></span>
                            ) : (
                                <>
                                    <Icons.Check size={20} className="mr-2" />
                                    {editingId ? 'Actualizar Compra' : 'Registrar Compra'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* --- PREVIEW MODAL (Portal) --- */}
            {preview && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setPreview(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-inScale" onClick={e => e.stopPropagation()}>
                        <div className="bg-gray-900 p-6 text-white text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Icons.ShoppingBag size={100} /></div>
                            <h3 className="text-2xl font-bold relative z-10">{preview.supplierName}</h3>
                            <p className="text-gray-400 text-sm relative z-10 flex justify-center items-center gap-2 mt-1">
                                <Icons.FileText size={14} /> {preview.invoiceNo || 'Sin Factura'}
                                <span>•</span>
                                <span>{formatDate(preview.date)}</span>
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="mb-6 flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs font-bold text-gray-500 uppercase">Estado</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${preview.status === 'Pagado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {preview.status || 'Pendiente'}
                                </span>
                            </div>
                            <div className="max-h-60 overflow-y-auto mb-4 border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs font-bold text-gray-500">
                                        <tr><th className="p-2 text-left">Item</th><th className="p-2 text-right">Cant</th><th className="p-2 text-right">Total</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {preview.items.map((i, x) => (
                                            <tr key={x}>
                                                <td className="p-2 text-gray-700">{i.productName}</td>
                                                <td className="p-2 text-right font-mono text-xs">{i.qty}</td>
                                                <td className="p-2 text-right font-medium">{formatCurrency(i.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-between items-end border-t border-dashed border-gray-200 pt-4">
                                <div className="text-right w-full">
                                    <span className="block text-xs text-gray-400 uppercase font-bold">Total Compra</span>
                                    <span className="text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(preview.total)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-center">
                            <button onClick={() => setPreview(null)} className="text-gray-500 font-bold text-sm hover:text-gray-800 transition">Cerrar Detalle</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
