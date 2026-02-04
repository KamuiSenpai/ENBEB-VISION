import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/ui/Icons';
import { formatCurrency, formatDate } from '../lib/utils';
import { db, appId } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, arrayUnion } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export const Inventory = () => {
    const { products, suppliers, showNotification } = useData();
    const { user } = useAuth();

    // --- STATES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterStockStatus, setFilterStockStatus] = useState('All'); // All, Low, Out, Good
    const [filterSupplier, setFilterSupplier] = useState('All');
    const [showArchived, setShowArchived] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // Modal States
    const [editingId, setEditingId] = useState(null);
    const [adjustingProd, setAdjustingProd] = useState(null);

    // Form States
    const [newProdName, setNewProdName] = useState('');
    const [newProdCost, setNewProdCost] = useState('');
    const [newProdPrice, setNewProdPrice] = useState('');
    const [newProdStock, setNewProdStock] = useState('');
    const [newProdSupplier, setNewProdSupplier] = useState('');
    const [newProdCategory, setNewProdCategory] = useState('Abarrotes');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Adjust States
    const [adjStock, setAdjStock] = useState('');
    const [adjReason, setAdjReason] = useState('');

    const productCategories = ["Abarrotes", "Bebidas", "Lácteos", "Limpieza", "Cuidado Personal", "Carnes/Embutidos", "Frutas/Verduras", "Panadería/Dulces", "Licores", "Otros"];

    // --- KPI LOGIC ---
    const kpiMetrics = useMemo(() => {
        let totalValuation = 0; // Cost * Stock
        let potentialRevenue = 0; // Price * Stock
        let lowStockCount = 0;
        let outOfStockCount = 0;

        products.forEach(p => {
            if (p.status === 'inactive') return;
            const stock = p.stock || 0;
            const cost = p.cost || 0;
            const price = p.price || 0; // Base Price

            totalValuation += (cost * stock);
            potentialRevenue += (price * stock * 1.18); // Including IGV for revenue view

            if (stock <= 0) outOfStockCount++;
            else if (stock < 5) lowStockCount++;
        });

        return { totalValuation, potentialRevenue, lowStockCount, outOfStockCount, totalItems: products.filter(p => p.status !== 'inactive').length };
    }, [products]);

    // --- FILTERING LOGIC ---
    const processedProducts = useMemo(() => {
        let res = [...products];
        // 1. Archive Filter
        if (!showArchived) res = res.filter(p => p.status !== 'inactive');
        else res = res.filter(p => p.status === 'inactive');

        // 2. Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            res = res.filter(p => p.name.toLowerCase().includes(lower) || (p.category || '').toLowerCase().includes(lower));
        }

        // 3. Category Filter
        if (filterCategory !== 'All') {
            res = res.filter(p => p.category === filterCategory);
        }

        // 4. Supplier Filter
        if (filterSupplier !== 'All') {
            res = res.filter(p => p.supplierId === filterSupplier);
        }

        // 5. Stock Status Filter
        if (filterStockStatus !== 'All') {
            if (filterStockStatus === 'Out') res = res.filter(p => (p.stock || 0) <= 0);
            else if (filterStockStatus === 'Low') res = res.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 5);
            else if (filterStockStatus === 'Good') res = res.filter(p => (p.stock || 0) >= 5);
        }

        // 6. Sorting
        res.sort((a, b) => {
            let valA, valB;

            if (sortConfig.key === 'margin') {
                valA = a.price ? ((a.price - a.cost) / a.price) : 0;
                valB = b.price ? ((b.price - b.cost) / b.price) : 0;
            } else {
                valA = a[sortConfig.key];
                valB = b[sortConfig.key];
            }

            // Handle strings vs numbers
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = (valB || '').toLowerCase();
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            } else {
                // Numbers
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
        });

        return res;
    }, [products, searchTerm, showArchived, filterCategory, filterStockStatus, filterSupplier, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };


    // --- ACTIONS ---
    const handleEdit = (prod) => {
        setNewProdName(prod.name);
        setNewProdCost(prod.cost);
        setNewProdPrice(prod.price);
        setNewProdStock(prod.stock);
        setNewProdSupplier(prod.supplierId || '');
        setNewProdCategory(prod.category || 'Abarrotes');
        setEditingId(prod.id);
        // Scroll to form logic if needed, but sticky sidebar handles it visually
    };

    const cancelEdit = () => {
        setNewProdName(''); setNewProdCost(''); setNewProdPrice(''); setNewProdStock(''); setNewProdSupplier('');
        setNewProdCategory('Abarrotes');
        setEditingId(null);
    };

    const saveProduct = async () => {
        if (!newProdName) return;
        setIsSubmitting(true);
        const costVal = parseFloat(newProdCost) || 0;
        const priceVal = parseFloat(newProdPrice) || 0;
        const stockVal = parseInt(newProdStock) || 0;

        const productData = {
            name: newProdName,
            cost: costVal,
            price: priceVal,
            stock: stockVal,
            supplierId: newProdSupplier,
            category: newProdCategory,
            updatedAt: Timestamp.now(),
            status: 'active'
        };

        try {
            const timestamp = new Date().toISOString();
            if (editingId) {
                const oldProd = products.find(p => p.id === editingId);
                // History check
                if (oldProd && (oldProd.cost !== costVal || oldProd.price !== priceVal)) {
                    productData.priceHistory = arrayUnion({
                        date: timestamp,
                        cost: costVal,
                        price: priceVal,
                        source: 'Manual',
                        note: 'Actualización Maestra',
                        type: 'update'
                    });
                }
                productData.status = oldProd.status || 'active';
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', editingId), productData);
                showNotification("Producto actualizado.", "success");
            } else {
                productData.createdAt = Timestamp.now();
                productData.priceHistory = [{ date: timestamp, cost: costVal, price: priceVal, source: 'Manual', note: 'Creación Inicial', type: 'create' }];
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'products'), productData);
                showNotification("Producto creado.", "success");
            }
            cancelEdit();
        } catch (e) {
            console.error(e);
            showNotification("Error al guardar.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteProduct = async (id) => {
        if (!window.confirm("¿Seguro de eliminar este producto? Se perderá el historial.")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', id));
            showNotification("Producto eliminado.", "success");
        } catch (e) {
            showNotification("Error al eliminar.", 'error');
        }
    };

    const handleOpenAdjust = (prod) => { setAdjustingProd(prod); setAdjStock(prod.stock); setAdjReason(''); };

    const saveAdjustment = async () => {
        if (!adjReason) { showNotification("Indique un motivo.", "error"); return; }
        const newStockVal = parseInt(adjStock);
        if (isNaN(newStockVal)) return;

        try {
            const diff = newStockVal - adjustingProd.stock;
            const timestamp = new Date().toISOString();

            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', adjustingProd.id), {
                stock: newStockVal,
                priceHistory: arrayUnion({
                    date: timestamp,
                    cost: adjustingProd.cost,
                    price: adjustingProd.price,
                    stockBefore: adjustingProd.stock,
                    stockAfter: newStockVal,
                    source: 'Ajuste',
                    note: `${adjReason} (${diff > 0 ? '+' : ''}${diff})`,
                    type: 'adjust'
                })
            });
            showNotification("Stock ajustado.", "success");
            setAdjustingProd(null);
        } catch (e) {
            showNotification("Error al ajustar stock.", 'error');
        }
    };

    // Excel Export
    const handleExport = () => {
        if (processedProducts.length === 0) { showNotification("Nada que exportar.", "error"); return; }
        const data = [
            ["REPORTE DE INVENTARIO VALORIZADO"],
            [`Generado: ${new Date().toLocaleString()}`],
            [""],
            ["CATEGORÍA", "PRODUCTO", "STOCK ACTUAL", "COSTO UNIT.", "VALOR TOTAL (COSTO)", "PRECIO UNIT.", "VALOR VENTA EST."]
        ];

        processedProducts.forEach(p => {
            data.push([
                p.category || 'General',
                p.name,
                p.stock,
                p.cost,
                p.cost * p.stock,
                p.price,
                p.price * p.stock * 1.18 // Price is base, so value is +IGV usually for potential
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        XLSX.writeFile(wb, `Inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- RENDER HELPERS ---
    const getStockBarColor = (curr, max = 50) => {
        if (curr <= 0) return 'bg-gray-200';
        if (curr < 5) return 'bg-red-500';
        if (curr < 20) return 'bg-orange-400';
        return 'bg-emerald-500';
    };

    const getStockWidth = (curr) => {
        const max = 100; // Arbitrary max for visualization
        const pct = Math.min((curr / max) * 100, 100);
        return `${pct}%`;
    };

    return (
        <div className="space-y-8 animate-fade-in relative pb-10">

            {/* --- DASHBOARD HEADER --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Icons.Dollar size={60} /></div>
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Valor Inventario (Costo)</p>
                    <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(kpiMetrics.totalValuation)}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">Capital inmovilizado</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Icons.TrendingUp size={60} /></div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Venta Potencial</p>
                    <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(kpiMetrics.potentialRevenue)}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">Incluido IGV estimado</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Icons.Alert size={60} /></div>
                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Stock Crítico</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-red-600">{kpiMetrics.lowStockCount}</h3>
                        <span className="text-xs text-red-400 font-medium">Bajo</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">{kpiMetrics.outOfStockCount} Agotados</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Icons.Package size={60} /></div>
                    <p className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-1">Total Items</p>
                    <h3 className="text-2xl font-bold text-gray-800">{kpiMetrics.totalItems}</h3>
                    <p className="text-[10px] text-gray-400 mt-2">SKUs Activos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">

                {/* --- SIDEBAR FORM --- */}
                <div className="lg:col-span-1 xl:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 lg:sticky lg:top-4 z-10">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <h3 className="font-bold flex items-center text-gray-800 gap-2">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Icons.Package size={18} /></div>
                                {editingId ? 'Editar SKU' : 'Nuevo SKU'}
                            </h3>
                            {editingId && <button onClick={cancelEdit} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded transition">Cancelar</button>}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Producto</label>
                                <input className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-medium" placeholder="Ej. Coca Cola 3L" value={newProdName} onChange={e => setNewProdName(e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                                <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" value={newProdCategory} onChange={e => setNewProdCategory(e.target.value)}>
                                    {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Costo Unit.</label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">S/</span>
                                        <input type="number" step="0.01" className="w-full bg-white border border-gray-200 rounded-lg p-2.5 pl-6 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-mono" placeholder="0.00" value={newProdCost} onChange={e => setNewProdCost(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Base</label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">S/</span>
                                        <input type="number" step="0.01" className="w-full bg-white border border-gray-200 rounded-lg p-2.5 pl-6 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold text-purple-700" placeholder="0.00" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock Inicial</label>
                                    <input type="number" className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 font-bold text-center" placeholder="0" value={newProdStock} onChange={e => setNewProdStock(e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Proveedor Principal</label>
                                <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-600" value={newProdSupplier} onChange={e => setNewProdSupplier(e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} - {s.company}</option>)}
                                </select>
                            </div>

                            <button onClick={saveProduct} disabled={isSubmitting} className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-bold shadow-lg shadow-gray-200 transition-all flex justify-center items-center mt-4">
                                {isSubmitting ? <span className="loader"></span> : (editingId ? 'Guardar Cambios' : 'Registrar Producto')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT & TABLE --- */}
                <div className="lg:col-span-2 xl:col-span-3 flex flex-col space-y-6">

                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            <input
                                type="text"
                                placeholder="Buscar SKU, marca..."
                                className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 pl-4 text-sm focus:ring-2 focus:ring-purple-500 outline-none w-full md:w-64"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowArchived(!showArchived)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${showArchived ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                                {showArchived ? 'Ocultar Inactivos' : 'Ver Inactivos'}
                            </button>
                            <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition">
                                <Icons.Download size={16} /> Exportar Excel
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/50 text-gray-500 border-b font-semibold uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="p-4 align-bottom">
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => handleSort('name')} className="flex items-center gap-1 font-bold uppercase text-xs hover:text-purple-600 transition">
                                                    Producto / Categoría
                                                    <Icons.ArrowUp size={12} className={`transition-transform ${sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'rotate-0 text-purple-600' : 'rotate-180 text-purple-600') : 'text-gray-300'}`} />
                                                </button>
                                                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-white border border-gray-200 text-gray-700 text-xs rounded p-1 outline-none font-normal">
                                                    <option value="All">Todas</option>
                                                    {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </th>
                                        <th className="p-4 w-48 align-bottom">
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => handleSort('stock')} className="flex items-center gap-1 font-bold uppercase text-xs hover:text-purple-600 transition">
                                                    Nivel de Stock
                                                    <Icons.ArrowUp size={12} className={`transition-transform ${sortConfig.key === 'stock' ? (sortConfig.direction === 'asc' ? 'rotate-0 text-purple-600' : 'rotate-180 text-purple-600') : 'text-gray-300'}`} />
                                                </button>
                                                <select value={filterStockStatus} onChange={e => setFilterStockStatus(e.target.value)} className="bg-white border border-gray-200 text-gray-700 text-xs rounded p-1 outline-none font-normal">
                                                    <option value="All">Todos</option>
                                                    <option value="Low">⚠️ Bajos</option>
                                                    <option value="Out">❌ Agotados</option>
                                                    <option value="Good">✅ Óptimos</option>
                                                </select>
                                            </div>
                                        </th>
                                        <th className="p-4 text-right align-bottom">
                                            <button onClick={() => handleSort('cost')} className="flex items-center justify-end w-full gap-1 font-bold uppercase text-xs hover:text-purple-600 transition">
                                                Costo
                                                <Icons.ArrowUp size={12} className={`transition-transform ${sortConfig.key === 'cost' ? (sortConfig.direction === 'asc' ? 'rotate-0 text-purple-600' : 'rotate-180 text-purple-600') : 'text-gray-300'}`} />
                                            </button>
                                        </th>
                                        <th className="p-4 text-right align-bottom">
                                            <button onClick={() => handleSort('price')} className="flex items-center justify-end w-full gap-1 font-bold uppercase text-xs hover:text-purple-600 transition">
                                                Precio Base
                                                <Icons.ArrowUp size={12} className={`transition-transform ${sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? 'rotate-0 text-purple-600' : 'rotate-180 text-purple-600') : 'text-gray-300'}`} />
                                            </button>
                                        </th>
                                        <th className="p-4 text-center align-bottom">
                                            <button onClick={() => handleSort('margin')} className="flex items-center justify-center w-full gap-1 font-bold uppercase text-xs hover:text-purple-600 transition">
                                                Margen
                                                <Icons.ArrowUp size={12} className={`transition-transform ${sortConfig.key === 'margin' ? (sortConfig.direction === 'asc' ? 'rotate-0 text-purple-600' : 'rotate-180 text-purple-600') : 'text-gray-300'}`} />
                                            </button>
                                        </th>
                                        <th className="p-4 text-right align-bottom">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {processedProducts.map(p => {
                                        const margin = p.price ? ((p.price - p.cost) / p.price) * 100 : 0;
                                        return (
                                            <tr key={p.id} className={`hover:bg-purple-50/5 transition-colors group ${p.status === 'inactive' ? 'opacity-50 grayscale' : ''}`}>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-800 text-base">{p.name}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded tracking-wide">{p.category}</span>
                                                        {p.status === 'inactive' && <span className="text-[10px] font-bold text-red-500 border border-red-200 px-1.5 py-0.5 rounded">INACTIVO</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div className="flex justify-between text-xs mb-1 font-bold text-gray-600">
                                                        <span>{p.stock} un.</span>
                                                        <span className={p.stock < 5 ? 'text-red-500' : 'text-emerald-500'}>{p.stock < 5 ? (p.stock === 0 ? 'Agotado' : 'Bajo') : 'Óptimo'}</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full ${getStockBarColor(p.stock)} transition-all duration-500`} style={{ width: getStockWidth(p.stock) }}></div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-mono text-gray-600 font-medium">{formatCurrency(p.cost)}</td>
                                                <td className="p-4 text-right">
                                                    <div className="font-bold text-gray-800">{formatCurrency(p.price)}</div>
                                                    <div className="text-[10px] text-gray-400">+IGV: {formatCurrency(p.price * 1.18)}</div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${margin > 30 ? 'text-emerald-600 bg-emerald-50' : margin > 15 ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50'}`}>
                                                        {margin.toFixed(0)}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleOpenAdjust(p)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition" title="Ajuste Rápido"><Icons.Clipboard size={18} /></button>

                                                        <button onClick={() => handleEdit(p)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title="Editar"><Icons.Edit size={18} /></button>
                                                        <button onClick={() => deleteProduct(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar"><Icons.Trash size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {processedProducts.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center">
                                                <div className="inline-block p-4 rounded-full bg-gray-50 text-gray-300 mb-3"><Icons.Search size={40} /></div>
                                                <p className="text-gray-500 font-medium">No se encontraron productos.</p>
                                                <p className="text-sm text-gray-400">Intenta cambiar los filtros o agrega uno nuevo.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODAL: STOCK ADJUST --- */}
            {adjustingProd && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setAdjustingProd(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-0 overflow-hidden animate-fade-inScale" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white text-center relative">
                            <button onClick={() => setAdjustingProd(null)} className="absolute right-4 top-4 text-gray-400 hover:text-white transition"><Icons.X size={20} /></button>
                            <h3 className="font-bold text-lg">{adjustingProd.name}</h3>
                            <p className="text-gray-400 text-sm">Ajuste Manual de Inventario</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="text-center">
                                <label className="text-xs font-bold text-gray-400 uppercase">Stock Físico Real</label>
                                <input type="number" className="w-full border-b-2 border-purple-500 text-center text-4xl font-bold py-2 outline-none focus:border-purple-700 transition-colors" value={adjStock} onChange={e => setAdjStock(e.target.value)} autoFocus />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Motivo del Ajuste</label>
                                <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-purple-500" value={adjReason} onChange={e => setAdjReason(e.target.value)}>
                                    <option value="">Seleccionar motivo...</option>
                                    <option value="Conteo Físico">📊 Conteo Físico / Inventario</option>
                                    <option value="Merma">🗑️ Merma / Dañado</option>
                                    <option value="Regalo">🎁 Bonificación / Regalo</option>
                                    <option value="Entrada">📥 Entrada Manual (Sin Compra)</option>
                                    <option value="Error">⚠️ Corrección Error Digitación</option>
                                </select>
                            </div>

                            <button onClick={saveAdjustment} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-indigo-200">
                                Confirmar Ajuste
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};
