import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/ui/Icons';
import { SmartProductSelect } from '../components/shared/SmartProductSelect';
import { formatCurrency, formatDate, calculatePaymentDate, exportToCSV } from '../lib/utils';
import { db, appId } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, increment, getDoc, writeBatch } from 'firebase/firestore';

export const Sales = () => {
    const { products, clients, sales, showNotification } = useData();
    const { user } = useAuth();

    // --- STATES ---
    // Filters
    const [filterClient, setFilterClient] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    // Form Main
    const [view, setView] = useState('list'); // 'list' | 'form'
    const [editingId, setEditingId] = useState(null);
    const [originalItems, setOriginalItems] = useState([]); // For rollback

    // Header Data
    const [selectedClient, setSelectedClient] = useState('');
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState('Pagado'); // 'Pagado' | 'Pendiente'

    // Items Data
    const [items, setItems] = useState([]);

    // Item Input
    const [currentProdId, setCurrentProdId] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(''); // Base Price (SIN IGV)
    const [priceSource, setPriceSource] = useState(''); // Info about where price came from

    // UI & Logic
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewSale, setPreviewSale] = useState(null);
    const [stockWarning, setStockWarning] = useState(null);

    // Constants
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const years = [2023, 2024, 2025, 2026];

    // --- SMART PRICING LOGIC ---
    useEffect(() => {
        if (!currentProdId) {
            setPrice('');
            setPriceSource('');
            setStockWarning(null);
            return;
        }

        const product = products.find(p => p.id === currentProdId);
        if (!product) return;

        // Check Stock
        if (product.stock < qty) {
            setStockWarning(`⚠️ Stock actual: ${product.stock}. Quedará negativo.`);
        } else {
            setStockWarning(null);
        }

        // Determine Price
        let suggested = product.price;
        let source = "Precio Base (Catálogo)";

        // 1. Look for last sale to THIS client
        if (selectedClient) {
            // Filter sales for this client containing this product
            const clientSales = sales
                .filter(s => s.clientId === selectedClient && s.items && s.items.some(i => i.productId === currentProdId))
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            if (clientSales.length > 0) {
                const lastItem = clientSales[0].items.find(i => i.productId === currentProdId);
                if (lastItem) {
                    suggested = lastItem.price;
                    source = `Última venta: ${formatDate(clientSales[0].date)}`;
                }
            }
        }

        setPrice(suggested);
        setPriceSource(source);

    }, [currentProdId, selectedClient, products, sales]);


    // Update due date automatically
    useEffect(() => {
        if (!dueDate && saleDate) {
            setDueDate(calculatePaymentDate(saleDate));
        }
    }, [saleDate]);


    // --- ACTIONS ---

    const resetForm = () => {
        setEditingId(null);
        setSelectedClient('');
        setSaleDate(new Date().toISOString().split('T')[0]);
        setDueDate('');
        setStatus('Pagado');
        setItems([]);
        setOriginalItems([]);
        setQty(1);
        setPrice('');
        setCurrentProdId('');
        setView('list');
        setStockWarning(null);
    };

    const handleEdit = (sale) => {
        setEditingId(sale.id);
        setSelectedClient(sale.clientId);
        setSaleDate(sale.date);
        setDueDate(sale.dueDate || calculatePaymentDate(sale.date));
        setStatus(sale.status || 'Pagado');
        setItems(sale.items || []);
        setOriginalItems(sale.items || []);
        setView('form');
    };

    const addItem = () => {
        const prod = products.find(p => p.id === currentProdId);
        if (!prod || qty <= 0 || !price) return;

        const existingIdx = items.findIndex(i => i.productId === currentProdId && i.price === parseFloat(price));

        const newItem = {
            productId: prod.id,
            productName: prod.name,
            qty: qty,
            price: parseFloat(price), // Base Price
            cost: prod.cost,
            subtotal: qty * parseFloat(price) // Base Subtotal
        };

        if (existingIdx >= 0) {
            const updated = [...items];
            updated[existingIdx].qty += qty;
            updated[existingIdx].subtotal = updated[existingIdx].qty * updated[existingIdx].price;
            setItems(updated);
        } else {
            setItems([...items, newItem]);
        }

        setCurrentProdId('');
        setQty(1);
        setPrice('');
        setPriceSource('');
    };

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleSave = async () => {
        if (items.length === 0 || !selectedClient) {
            showNotification("Datos incompletos.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const clientName = clients.find(c => c.id === selectedClient)?.name || 'Desconocido';

            // LOGIC CHANGE: Subtotal is SUM of items. Total is Subtotal + IGV (18%)
            const subtotal = items.reduce((acc, curr) => acc + curr.subtotal, 0);
            const igv = subtotal * 0.18;
            const total = subtotal + igv;

            const saleData = {
                date: saleDate,
                dueDate: dueDate,
                clientId: selectedClient,
                clientName,
                status,
                items,
                subtotal, // Adding explicit subtotal field
                igv,      // Adding explicit IGV field
                total,    // Grand Total including Tax
                updatedAt: Timestamp.now()
            };

            // START BATCH
            const batch = writeBatch(db);

            if (editingId) {
                // --- UPDATE LOGIC ---
                // 1. Revert Old Stock (Add back what was taken)
                for (const item of originalItems) {
                    const prodRef = doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.productId);
                    batch.update(prodRef, { stock: increment(item.qty) });
                }

                // 2. Subtract New Stock
                for (const item of items) {
                    const prodRef = doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.productId);
                    batch.update(prodRef, { stock: increment(-item.qty) });
                }

                const saleRef = doc(db, 'artifacts', appId, 'users', user.uid, 'sales', editingId);
                batch.update(saleRef, saleData);

                await batch.commit();
                showNotification("Venta actualizada correctamente.", "success");

            } else {
                // --- CREATE LOGIC ---
                saleData.createdAt = Timestamp.now();

                // Create custom ID or let Firestore generate one? 
                // Batch requires a ref. We can use doc(collection(...)) to generate one.
                const salesCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'sales');
                const newSaleRef = doc(salesCollection); // Auto-ID
                batch.set(newSaleRef, saleData);

                // Subtract Stock
                for (const item of items) {
                    const prodRef = doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.productId);
                    batch.update(prodRef, { stock: increment(-item.qty) });
                }

                await batch.commit();
                showNotification("Venta registrada exitosamente.", "success");
            }

            resetForm();

        } catch (e) {
            console.error(e);
            showNotification("Error crítico: La venta no se guardó.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (sale) => {
        if (!window.confirm("¿Anular venta? Se devolverá el stock.")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sales', sale.id));

            // Revert Stock
            for (const item of sale.items) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.productId), {
                    stock: increment(item.qty)
                });
            }
            showNotification("Venta anulada.", "success");
        } catch (e) {
            showNotification("Error al eliminar.", "error");
        }
    };

    const toggleStatus = async (sale) => {
        const newStatus = sale.status === 'Pagado' ? 'Pendiente' : 'Pagado';
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sales', sale.id), {
                status: newStatus
            });
            showNotification(`Estado cambiado a ${newStatus}`, 'success');
        } catch (e) {
            showNotification("Error al actualizar.", "error");
        }
    };

    // --- FILTRATION ---
    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            const sDate = new Date(s.date + 'T00:00:00');
            const matchMonth = filterMonth === 'all' ? true : sDate.getMonth() === parseInt(filterMonth);
            const matchYear = filterYear === 'all' ? true : sDate.getFullYear() === parseInt(filterYear);
            const matchStatus = filterStatus === 'all' ? true : (s.status || 'Pagado') === filterStatus;
            const matchClient = filterClient ? s.clientId === filterClient : true;

            const searchLower = searchTerm.toLowerCase();
            const matchSearch = !searchTerm ||
                s.clientName.toLowerCase().includes(searchLower) ||
                (s.invoiceNo && s.invoiceNo.toLowerCase().includes(searchLower));

            return matchMonth && matchYear && matchStatus && matchClient && matchSearch;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [sales, filterMonth, filterYear, filterStatus, filterClient, searchTerm]);

    const totalFiltered = filteredSales.reduce((acc, s) => acc + s.total, 0);

    // --- HELPER METRICS ---
    const getProfitMetrics = (sale) => {
        const saleItems = sale.items || [];
        // NEW LOGIC: Price IS Base Price.
        // If sale has 'igv' field, we know it was created with new logic.
        // If not, we might fall back? For now assume new logic or close enough.

        let totalNetSales = 0;
        let totalCost = 0;

        // Safety check
        const safeTotal = Number(sale.total) || 0;

        if (sale.subtotal) {
            // New format: subtotal is Sum(NetPrice * Qty)
            totalNetSales = Number(sale.subtotal) || 0;
        } else {
            // Old format fallback: Total / 1.18
            totalNetSales = safeTotal / 1.18;
        }

        saleItems.forEach(item => {
            const cost = Number(item.cost) || 0;
            const qty = Number(item.qty) || 0;
            totalCost += (cost * qty);
        });

        const profit = totalNetSales - totalCost;
        const margin = totalNetSales > 0 ? (profit / totalNetSales) * 100 : 0;

        return { profit: profit || 0, margin: margin || 0 };
    };


    return (
        <div className="space-y-6 animate-fade-in relative pb-10">

            {/* --- LIST VIEW --- */}
            {view === 'list' && (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Gestión de Ventas</h2>
                            <p className="text-gray-500 text-sm">Registro, facturación y control de ingresos.</p>
                        </div>
                        <button onClick={() => setView('form')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 flex items-center transition-all transform hover:-translate-y-0.5">
                            <Icons.Plus size={20} className="mr-2" /> Nueva Venta
                        </button>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex flex-wrap gap-3 flex-1">
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg p-2.5 pl-8 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
                            />
                            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="all">Todo el año</option>
                                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="all">Estado: Todos</option>
                                <option value="Pendiente">Pendientes</option>
                                <option value="Pagado">Pagados</option>
                            </select>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-400 uppercase font-bold">Total Venta</div>
                            <div className="text-xl font-bold text-gray-800">{formatCurrency(totalFiltered)}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-indigo-50/20 text-indigo-900/60 border-b font-semibold uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-right">Total</th>
                                    <th className="p-4 text-right">Utilidad</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSales.map(s => {
                                    const { profit, margin } = getProfitMetrics(s);
                                    return (
                                        <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="p-4 font-mono text-xs text-gray-500">
                                                <div className="text-gray-800 font-sans text-sm">{formatDate(s.date)}</div>
                                                {s.status === 'Pendiente' && <div className="text-orange-500">Vence: {formatDate(s.dueDate)}</div>}
                                            </td>
                                            <td className="p-4 font-medium text-gray-800">{s.clientName}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${s.status === 'Pagado' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                                                    {s.status || 'Pagado'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-800">{formatCurrency(s.total)}</td>
                                            <td className="p-4 text-right">
                                                <div className="text-xs font-bold text-emerald-600">{formatCurrency(profit)}</div>
                                                <div className="text-[10px] text-gray-400">{margin.toFixed(0)}%</div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setPreviewSale(s)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Ver Detalle"><Icons.Eye size={18} /></button>
                                                    <button onClick={() => toggleStatus(s)} className={`p-1.5 rounded-lg transition ${s.status === 'Pagado' ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`} title="Cambiar Estado">
                                                        {s.status === 'Pagado' ? <Icons.Clock size={18} /> : <Icons.Check size={18} />}
                                                    </button>
                                                    <button onClick={() => handleEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar"><Icons.Edit size={18} /></button>
                                                    <button onClick={() => handleDelete(s)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Anular"><Icons.Trash size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredSales.length === 0 && (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-400 italic">No tienes ventas registradas.</td></tr>
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
                            {editingId ? 'Editar Venta' : 'Registrar Nueva Venta'}
                        </h2>
                        {editingId && <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">Modo Edición</span>}
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Header Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente <span className="text-red-500">*</span></label>
                                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">Seleccionar Cliente...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                                <select value={status} onChange={e => setStatus(e.target.value)} className={`w-full border rounded-lg p-2.5 text-sm font-bold outline-none ${status === 'Pagado' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                    <option value="Pagado">Pagado (Al contado)</option>
                                    <option value="Pendiente">Pendiente (Crédito)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Emisión</label>
                                <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            {status === 'Pendiente' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vencimiento</label>
                                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-white border-orange-200 text-orange-600 font-bold rounded-lg p-2.5 text-sm outline-none" />
                                </div>
                            )}
                        </div>

                        {/* Items Section */}
                        <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
                            <div className="flex flex-col md:flex-row gap-4 items-start mb-6">
                                <div className="flex-1 w-full">
                                    <label className="text-xs font-bold text-indigo-400 mb-1 block">BUSCAR PRODUCTO</label>
                                    <SmartProductSelect products={products} value={currentProdId} onChange={setCurrentProdId} />
                                    {stockWarning && <p className="text-xs text-orange-500 font-bold mt-1 animate-pulse">{stockWarning}</p>}
                                </div>
                                <div className="w-full md:w-24">
                                    <label className="text-xs font-bold text-indigo-400 mb-1 block">CANT</label>
                                    <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="w-full border border-indigo-200 rounded-lg p-2 text-center font-bold outline-none focus:border-indigo-500" />
                                </div>
                                <div className="w-full md:w-32">
                                    <label className="text-xs font-bold text-indigo-400 mb-1 block">PRECIO (SIN IGV)</label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-2 text-gray-400 text-sm">S/</span>
                                        <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-indigo-200 rounded-lg p-2 pl-7 font-mono outline-none focus:border-indigo-500" placeholder="0.00" />
                                    </div>
                                </div>
                                <button onClick={addItem} className="w-full md:w-auto h-10 mt-5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-lg font-bold flex items-center justify-center transition">
                                    <Icons.Plus size={20} />
                                </button>
                            </div>
                            {priceSource && <div className="text-[10px] text-indigo-500 bg-indigo-100 px-2 py-1 rounded inline-block mb-3 -mt-4 border border-indigo-200">ℹ️ {priceSource}</div>}

                            {/* Items Table */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                                        <tr>
                                            <th className="p-3 text-left">Descripción</th>
                                            <th className="p-3 text-center">Cant</th>
                                            <th className="p-3 text-right">Precio U. (Base)</th>
                                            <th className="p-3 text-right">Subtotal</th>
                                            <th className="p-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-3 font-medium text-gray-700">{item.productName}</td>
                                                <td className="p-3 text-center text-gray-600 bg-gray-50 font-mono text-xs">{item.qty}</td>
                                                <td className="p-3 text-right text-gray-600">{formatCurrency(item.price)}</td>
                                                <td className="p-3 text-right font-bold text-gray-800">{formatCurrency(item.subtotal)}</td>
                                                <td className="p-3">
                                                    <button onClick={() => removeItem(idx)} className="text-red-300 hover:text-red-500 transition"><Icons.X size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {items.length === 0 && (
                                            <tr><td colSpan="5" className="p-8 text-center text-gray-400 text-xs italic">Agrega productos a la venta...</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end mt-4 items-end gap-6">
                                <div className="text-right">
                                    <span className="block text-xs text-gray-400 font-bold uppercase">Subtotal (Neto)</span>
                                    <span className="text-sm font-medium text-gray-600">{formatCurrency(items.reduce((s, i) => s + i.subtotal, 0))}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-gray-400 font-bold uppercase">IGV (18%)</span>
                                    <span className="text-sm font-medium text-gray-600">{formatCurrency(items.reduce((s, i) => s + i.subtotal, 0) * 0.18)}</span>
                                </div>
                                <div className="text-right pl-6 border-l border-gray-200">
                                    <span className="block text-xs text-gray-400 font-bold uppercase">Total a Pagar</span>
                                    <span className="text-2xl font-bold text-gray-800 tracking-tight">{formatCurrency(items.reduce((s, i) => s + i.subtotal, 0) * 1.18)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 border-t flex gap-4">
                        <button onClick={resetForm} className="w-1/3 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-100 transition">Cancelar</button>
                        <button onClick={handleSave} disabled={isSubmitting} className="flex-1 bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-bold shadow-lg transition disabled:opacity-50 flex justify-center items-center">
                            {isSubmitting ? (
                                <span className="loader mr-2"></span>
                            ) : (
                                <>
                                    <Icons.Check size={20} className="mr-2" />
                                    {editingId ? 'Actualizar Venta' : 'Emitir Documento'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* --- PREVIEW MODAL (Portal) --- */}
            {previewSale && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setPreviewSale(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-inScale" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-6 text-white text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Icons.Tag size={100} /></div>
                            <h3 className="text-xl font-bold relative z-10">{previewSale.clientName}</h3>
                            <p className="text-indigo-200 text-sm relative z-10 mt-1">{formatDate(previewSale.date)}</p>
                            <div className="mt-4 inline-flex items-center bg-indigo-700 rounded-lg px-3 py-1 text-xs font-medium">
                                Estado: {previewSale.status}
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="max-h-60 overflow-y-auto mb-4 border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs font-bold text-gray-500">
                                        <tr><th className="p-2 text-left">Item</th><th className="p-2 text-center">Cant</th><th className="p-2 text-right">Total (Base)</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {previewSale.items.map((i, x) => (
                                            <tr key={x}>
                                                <td className="p-2 text-gray-700">{i.productName}</td>
                                                <td className="p-2 text-center font-mono text-xs">{i.qty}</td>
                                                <td className="p-2 text-right font-medium">{formatCurrency(i.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Profit Section (Only Visible Admin/User check usually, here always) */}
                            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg mb-4 flex justify-between items-center">
                                <span className="text-emerald-700 text-xs font-bold uppercase">Utilidad Real</span>
                                <div className="text-right">
                                    <span className="block font-bold text-emerald-800">{formatCurrency(getProfitMetrics(previewSale).profit)}</span>
                                    <span className="text-[10px] text-emerald-600">Margen: {getProfitMetrics(previewSale).margin.toFixed(0)}%</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-end border-t border-dashed border-gray-200 pt-4 text-sm text-gray-500">
                                <span>Subtotal</span>
                                <span>{formatCurrency(previewSale.subtotal || (previewSale.total / 1.18))}</span>
                            </div>
                            <div className="flex justify-between items-end pt-1 text-sm text-gray-500">
                                <span>IGV (18%)</span>
                                <span>{formatCurrency(previewSale.igv || (previewSale.total - previewSale.total / 1.18))}</span>
                            </div>

                            <div className="flex justify-between items-end pt-2 mt-2 border-t border-gray-200">
                                <div className="text-right w-full">
                                    <span className="block text-xs text-gray-400 uppercase font-bold">Total Facturado</span>
                                    <span className="text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(previewSale.total)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-center">
                            <button onClick={() => setPreviewSale(null)} className="text-gray-500 font-bold text-sm hover:text-gray-800 transition">Cerrar Detalle</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
