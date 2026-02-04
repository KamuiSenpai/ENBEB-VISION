import React, { useState, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/ui/Icons';
import { formatCurrency, formatDate } from '../lib/utils';
import { db, appId } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, Timestamp, increment, arrayUnion } from 'firebase/firestore';
import { processMultipleInvoices, validateInvoiceData } from '../lib/geminiService';

export const InvoiceUpload = () => {
    const { products, suppliers, showNotification } = useData();
    const { user } = useAuth();

    // --- STATE ---
    const [step, setStep] = useState(1); // 1: Upload, 2: Processing, 3: Review
    const [files, setFiles] = useState([]);
    const [processedInvoices, setProcessedInvoices] = useState([]);
    const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, status: '', fileName: '' });
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false);

    // --- FILE HANDLING ---
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => file.type.startsWith('image/')
        );

        if (droppedFiles.length > 0) {
            setFiles(prev => [...prev, ...droppedFiles]);
        }
    }, []);

    const handleFileSelect = (e) => {
        const MAX_SIZE_MB = 5 * 1024 * 1024; // 5MB
        const selectedFiles = Array.from(e.target.files).filter(file => {
            if (!file.type.startsWith('image/')) return false;
            if (file.size > MAX_SIZE_MB) {
                showNotification(`El archivo ${file.name} excede 5MB`, 'warning');
                return false;
            }
            return true;
        });
        setFiles(prev => [...prev, ...selectedFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // --- PROCESSING ---
    const handleProcess = async () => {
        if (files.length === 0) {
            showNotification('Selecciona al menos una imagen', 'error');
            return;
        }

        setStep(2);
        setProcessingProgress({ current: 0, total: files.length, status: 'starting', fileName: '' });

        try {
            const results = await processMultipleInvoices(files, (current, total, status, fileName) => {
                setProcessingProgress({ current, total, status, fileName });
            });

            // Validate each result
            const validatedResults = results.map(result => {
                if (result.success) {
                    const validation = validateInvoiceData(result.data, products, suppliers);
                    return {
                        ...result,
                        validation,
                        // Editable copy of data
                        editableData: JSON.parse(JSON.stringify(result.data))
                    };
                }
                return result;
            });

            setProcessedInvoices(validatedResults);
            setStep(3);

        } catch (error) {
            console.error('Error processing invoices:', error);
            showNotification('Error al procesar las facturas', 'error');
            setStep(1);
        }
    };

    // --- EDITING ---
    const updateInvoiceData = (index, updatedData) => {
        setProcessedInvoices(prev => {
            const newList = [...prev];
            newList[index].editableData = updatedData;
            // Re-validate
            newList[index].validation = validateInvoiceData(updatedData, products, suppliers);
            return newList;
        });
    };

    const removeInvoice = (index) => {
        setProcessedInvoices(prev => prev.filter((_, i) => i !== index));
    };

    const linkProduct = (invoiceIndex, itemIndex, productId) => {
        setProcessedInvoices(prev => {
            const newList = [...prev];
            const product = products.find(p => p.id === productId);
            if (product) {
                newList[invoiceIndex].editableData.items[itemIndex]._linkedProduct = product;
                newList[invoiceIndex].validation.productMatches[itemIndex].matchedProduct = product;
                newList[invoiceIndex].validation.productMatches[itemIndex].isNew = false;
            }
            return newList;
        });
    };

    const linkSupplier = (invoiceIndex, supplierId) => {
        setProcessedInvoices(prev => {
            const newList = [...prev];
            const supplier = suppliers.find(s => s.id === supplierId);
            if (supplier) {
                newList[invoiceIndex].editableData.supplier._linkedSupplier = supplier;
                newList[invoiceIndex].validation.matchedSupplier = supplier;
                newList[invoiceIndex].validation.hasNewSupplier = false;
            }
            return newList;
        });
    };

    // --- SAVING ---
    const handleConfirmAll = async () => {
        const validInvoices = processedInvoices.filter(inv => inv.success);
        if (validInvoices.length === 0) {
            showNotification('No hay facturas válidas para registrar', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            for (const invoice of validInvoices) {
                await saveSingleInvoice(invoice);
            }

            showNotification(`${validInvoices.length} factura(s) registrada(s) exitosamente`, 'success');

            // Reset
            setFiles([]);
            setProcessedInvoices([]);
            setStep(1);

        } catch (error) {
            console.error('Error saving invoices:', error);
            showNotification('Error al guardar algunas facturas', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const saveSingleInvoice = async (invoice) => {
        const data = invoice.editableData;
        const validation = invoice.validation;

        // 1. Create supplier if new
        let supplierId = validation.matchedSupplier?.id;
        let supplierName = validation.matchedSupplier?.name || data.supplier.name;

        if (!supplierId && data.supplier.name) {
            const newSupplierRef = await addDoc(
                collection(db, 'artifacts', appId, 'users', user.uid, 'suppliers'),
                {
                    name: data.supplier.name,
                    ruc: data.supplier.ruc || '',
                    address: data.supplier.address || '',
                    phone: '',
                    email: '',
                    createdAt: Timestamp.now(),
                    source: 'OCR Import'
                }
            );
            supplierId = newSupplierRef.id;
            supplierName = data.supplier.name;
        }

        // 2. Create products if new and prepare items
        const purchaseItems = [];
        const timestamp = new Date().toISOString();

        for (let i = 0; i < data.items.length; i++) {
            const item = data.items[i];
            const match = validation.productMatches[i];

            let productId = match.matchedProduct?.id || item._linkedProduct?.id;
            let productName = match.matchedProduct?.name || item._linkedProduct?.name || item.description;

            if (!productId) {
                // Create new product
                const newProductRef = await addDoc(
                    collection(db, 'artifacts', appId, 'users', user.uid, 'products'),
                    {
                        name: item.description,
                        category: 'Sin Categoría',
                        stock: 0,
                        cost: item.unitPrice || 0,
                        price: (item.unitPrice || 0) * 1.3, // Default 30% margin
                        minStock: 5,
                        status: 'active',
                        createdAt: Timestamp.now(),
                        source: 'OCR Import'
                    }
                );
                productId = newProductRef.id;
                productName = item.description;
            }

            purchaseItems.push({
                productId,
                productName,
                qty: item.quantity || 1,
                cost: item.unitPrice || 0,
                subtotal: item.subtotal || (item.quantity * item.unitPrice) || 0
            });
        }

        // 3. Create purchase
        const subtotal = data.totals?.subtotal || purchaseItems.reduce((sum, i) => sum + i.subtotal, 0);
        const igv = data.totals?.igv || subtotal * 0.18;
        const total = data.totals?.total || subtotal + igv;

        const purchaseData = {
            date: data.invoice?.date || new Date().toISOString().split('T')[0],
            supplierId,
            supplierName,
            invoiceNo: data.invoice?.number || '',
            paymentDate: data.invoice?.paymentDate || '',
            status: 'Pendiente',
            items: purchaseItems,
            subtotal,
            igv,
            total,
            createdAt: Timestamp.now(),
            source: 'OCR Import'
        };

        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'purchases'), purchaseData);

        // 4. Update product stock and cost
        for (const item of purchaseItems) {
            const prod = products.find(p => p.id === item.productId);
            const currentStock = prod?.stock || 0;
            const currentCost = prod?.cost || 0;
            const newStock = currentStock + item.qty;
            const newCost = newStock > 0 ? ((currentStock * currentCost) + (item.qty * item.cost)) / newStock : item.cost;

            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'products', item.productId), {
                stock: increment(item.qty),
                cost: newCost,
                priceHistory: arrayUnion({
                    date: timestamp,
                    cost: item.cost,
                    source: 'Compra OCR',
                    note: `Fac. ${data.invoice?.number || 'S/N'}`,
                    type: 'purchase'
                })
            });
        }
    };

    // --- SUMMARY STATS ---
    const stats = useMemo(() => {
        const valid = processedInvoices.filter(i => i.success);
        const withIssues = valid.filter(i => i.validation?.status === 'review');
        const newSuppliers = valid.filter(i => i.validation?.hasNewSupplier);
        const newProducts = valid.reduce((sum, i) => sum + (i.validation?.newProductsCount || 0), 0);
        const totalAmount = valid.reduce((sum, i) => sum + (i.editableData?.totals?.total || 0), 0);

        return { valid: valid.length, withIssues: withIssues.length, newSuppliers: newSuppliers.length, newProducts, totalAmount };
    }, [processedInvoices]);

    // --- RENDER ---
    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Icons.Camera size={28} className="text-indigo-600" />
                        Cargar Facturas
                    </h2>
                    <p className="text-gray-500 text-sm">Sube fotos de tus facturas y el sistema las registrará automáticamente.</p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-center gap-4">
                    {[
                        { num: 1, label: 'Subir Fotos', icon: Icons.Upload },
                        { num: 2, label: 'Procesando', icon: Icons.Loader },
                        { num: 3, label: 'Revisar y Confirmar', icon: Icons.Check }
                    ].map((s, idx) => (
                        <React.Fragment key={s.num}>
                            <div className={`flex items-center gap-2 ${step >= s.num ? 'text-indigo-600' : 'text-gray-400'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all ${step > s.num ? 'bg-indigo-600 text-white' :
                                    step === s.num ? 'bg-indigo-100 text-indigo-600 ring-4 ring-indigo-50' :
                                        'bg-gray-100 text-gray-400'
                                    }`}>
                                    {step > s.num ? <Icons.Check size={20} /> : s.num}
                                </div>
                                <span className="font-medium hidden sm:block">{s.label}</span>
                            </div>
                            {idx < 2 && <div className={`w-12 h-0.5 ${step > s.num ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Step 1: Upload */}
            {step === 1 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`p-12 border-2 border-dashed rounded-xl m-6 text-center transition-all cursor-pointer
                            ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
                    >
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                            id="fileInput"
                        />
                        <label htmlFor="fileInput" className="cursor-pointer">
                            <Icons.Upload size={48} className={`mx-auto mb-4 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <p className="text-lg font-medium text-gray-700">
                                {isDragging ? 'Suelta las imágenes aquí' : 'Arrastra tus fotos de facturas aquí'}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">o haz clic para seleccionar archivos</p>
                        </label>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="px-6 pb-6">
                            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <Icons.FileText size={18} />
                                {files.length} archivo(s) seleccionado(s)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {files.map((file, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={file.name}
                                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                        />
                                        <button
                                            onClick={() => removeFile(idx)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Icons.X size={14} />
                                        </button>
                                        <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action */}
                    <div className="bg-gray-50 p-4 border-t flex justify-end">
                        <button
                            onClick={handleProcess}
                            disabled={files.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.Zap size={20} />
                            Procesar con IA
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Processing */}
            {step === 2 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <div className="animate-spin w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Procesando con Inteligencia Artificial</h3>
                    <p className="text-gray-500 mb-4">
                        Analizando factura {processingProgress.current} de {processingProgress.total}
                    </p>
                    {processingProgress.fileName && (
                        <p className="text-sm text-gray-400 font-mono">{processingProgress.fileName}</p>
                    )}
                    <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2 mt-6">
                        <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${processingProgress.total > 0 ? (processingProgress.current / processingProgress.total) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-emerald-100 text-center">
                            <div className="text-2xl font-bold text-emerald-600">{stats.valid}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Facturas OK</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-amber-100 text-center">
                            <div className="text-2xl font-bold text-amber-600">{stats.withIssues}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Para Revisar</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-blue-100 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.newSuppliers}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Proveedores Nuevos</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-purple-100 text-center">
                            <div className="text-2xl font-bold text-purple-600">{stats.newProducts}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Productos Nuevos</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 text-center">
                            <div className="text-2xl font-bold text-indigo-600">{formatCurrency(stats.totalAmount)}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Total</div>
                        </div>
                    </div>

                    {/* Invoice List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 text-gray-500 border-b font-semibold uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4">Factura</th>
                                    <th className="p-4">Proveedor</th>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4 text-center">Items</th>
                                    <th className="p-4 text-right">Total</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {processedInvoices.map((inv, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            {!inv.success ? (
                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">Error</span>
                                            ) : inv.validation?.status === 'review' ? (
                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-600 flex items-center gap-1 w-fit">
                                                    <Icons.AlertTriangle size={12} /> Revisar
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-600 flex items-center gap-1 w-fit">
                                                    <Icons.Check size={12} /> Listo
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 font-mono text-xs">{inv.editableData?.invoice?.number || 'S/N'}</td>
                                        <td className="p-4">
                                            <span className="font-medium text-gray-800">{inv.editableData?.supplier?.name || 'Desconocido'}</span>
                                            {inv.validation?.hasNewSupplier && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600">NUEVO</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-600">{inv.editableData?.invoice?.date || '-'}</td>
                                        <td className="p-4 text-center">
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                                                {inv.editableData?.items?.length || 0}
                                            </span>
                                            {inv.validation?.newProductsCount > 0 && (
                                                <span className="ml-1 text-purple-600 text-xs">({inv.validation.newProductsCount} nuevos)</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-bold text-gray-800">
                                            {formatCurrency(inv.editableData?.totals?.total || 0)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedInvoice({ index: idx, data: inv })}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                    title="Ver/Editar"
                                                >
                                                    <Icons.Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => removeInvoice(idx)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Eliminar"
                                                >
                                                    <Icons.Trash size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {processedInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-gray-400 italic">No se procesaron facturas</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 justify-end">
                        <button
                            onClick={() => { setStep(1); setProcessedInvoices([]); }}
                            className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirmAll}
                            disabled={isSubmitting || stats.valid === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Icons.Check size={20} />
                                    Confirmar y Registrar ({stats.valid})
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}

            {/* Invoice Detail Modal */}
            {selectedInvoice && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-inScale" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold">Detalle de Factura</h3>
                                    <p className="text-indigo-200 text-sm mt-1">
                                        {selectedInvoice.data.editableData?.invoice?.number || 'Sin número'}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedInvoice(null)} className="text-white/60 hover:text-white">
                                    <Icons.X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Supplier Section */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <Icons.Building size={18} /> Proveedor
                                    {selectedInvoice.data.validation?.hasNewSupplier && (
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-600">NUEVO</span>
                                    )}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold">Nombre</label>
                                        <p className="font-medium">{selectedInvoice.data.editableData?.supplier?.name || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold">RUC</label>
                                        <p className="font-mono">{selectedInvoice.data.editableData?.supplier?.ruc || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold">Dirección</label>
                                        <p className="text-sm text-gray-600">{selectedInvoice.data.editableData?.supplier?.address || '-'}</p>
                                    </div>
                                </div>

                                {selectedInvoice.data.validation?.hasNewSupplier && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <label className="text-xs text-gray-500 uppercase font-bold block mb-2">¿Vincular a proveedor existente?</label>
                                        <select
                                            onChange={(e) => linkSupplier(selectedInvoice.index, e.target.value)}
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm"
                                        >
                                            <option value="">Crear nuevo proveedor</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.ruc})</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Items Section */}
                            <div>
                                <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <Icons.Package size={18} /> Productos
                                </h4>
                                <div className="border rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                                            <tr>
                                                <th className="p-3 text-left">Descripción</th>
                                                <th className="p-3 text-center">Cant</th>
                                                <th className="p-3 text-right">P.Unit</th>
                                                <th className="p-3 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedInvoice.data.editableData?.items?.map((item, itemIdx) => {
                                                const match = selectedInvoice.data.validation?.productMatches?.[itemIdx];
                                                return (
                                                    <tr key={itemIdx}>
                                                        <td className="p-3">
                                                            <div className="font-medium text-gray-800">{item.description}</div>
                                                            {match?.isNew ? (
                                                                <div className="mt-1">
                                                                    <span className="text-xs text-purple-600 font-bold">Producto nuevo</span>
                                                                    <select
                                                                        onChange={(e) => linkProduct(selectedInvoice.index, itemIdx, e.target.value)}
                                                                        className="mt-1 w-full bg-white border border-gray-200 rounded p-1 text-xs"
                                                                    >
                                                                        <option value="">Crear nuevo producto</option>
                                                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                    </select>
                                                                </div>
                                                            ) : match?.matchedProduct && (
                                                                <div className="text-xs text-emerald-600 mt-1">
                                                                    ✓ Vinculado a: {match.matchedProduct.name}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center font-mono">{item.quantity}</td>
                                                        <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                                                        <td className="p-3 text-right font-bold">{formatCurrency(item.subtotal)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="flex justify-end">
                                <div className="bg-gray-50 rounded-xl p-4 w-64">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500">Subtotal:</span>
                                        <span>{formatCurrency(selectedInvoice.data.editableData?.totals?.subtotal || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500">IGV:</span>
                                        <span>{formatCurrency(selectedInvoice.data.editableData?.totals?.igv || 0)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                                        <span>Total:</span>
                                        <span className="text-indigo-600">{formatCurrency(selectedInvoice.data.editableData?.totals?.total || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 p-4 border-t flex justify-end">
                            <button onClick={() => setSelectedInvoice(null)} className="text-gray-600 font-bold hover:text-gray-800">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
