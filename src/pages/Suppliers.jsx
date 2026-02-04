import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/ui/Icons';
import { db, appId } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';

export const Suppliers = () => {
    const { suppliers, showNotification } = useData();
    const { user } = useAuth();

    // --- STATES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [name, setName] = useState('');
    const [ruc, setRuc] = useState('');
    const [category, setCategory] = useState('');
    const [contact, setContact] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    // --- HELPERS ---
    const getInitials = (name) => {
        return name
            ? name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
            : 'PV';
    };

    const getRandomColor = (name) => {
        const colors = ['bg-slate-100 text-slate-600', 'bg-orange-100 text-orange-600', 'bg-amber-100 text-amber-600', 'bg-cyan-100 text-cyan-600', 'bg-emerald-100 text-emerald-600'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // --- DATA PROCESSING ---
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.ruc && s.ruc.includes(searchTerm)) ||
            (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [suppliers, searchTerm]);

    const kpiMetrics = useMemo(() => {
        const total = suppliers.length;

        // Find top category
        const catMap = {};
        suppliers.forEach(s => {
            const c = s.category || 'Sin Categoría';
            catMap[c] = (catMap[c] || 0) + 1;
        });
        const topCategory = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a])[0] || '-';

        // New suppliers this month
        const now = new Date();
        const newSuppliers = suppliers.filter(s => {
            if (!s.createdAt) return false;
            const date = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;

        return { total, topCategory, newSuppliers };
    }, [suppliers]);

    // --- ACTIONS ---
    const handleEdit = (s) => {
        setEditingId(s.id);
        setName(s.name);
        setRuc(s.ruc || '');
        setCategory(s.category || '');
        setContact(s.contact || '');
        setPhone(s.phone || '');
        setEmail(s.email || '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setName(''); setRuc(''); setCategory(''); setContact(''); setPhone(''); setEmail('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = {
                name,
                ruc,
                category,
                contact,
                phone,
                email,
                updatedAt: Timestamp.now()
            };

            if (editingId) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'suppliers', editingId), data);
                showNotification("Proveedor actualizado correctamente.", "success");
            } else {
                data.createdAt = Timestamp.now();
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'suppliers'), data);
                showNotification("Proveedor registrado exitosamente.", "success");
            }
            handleCloseModal();
        } catch (e) {
            showNotification("Hubo un error al guardar.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este proveedor?")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'suppliers', id));
            showNotification("Proveedor eliminado.", "success");
        } catch (e) {
            showNotification("Error al eliminar.", 'error');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">

            {/* KPI STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Icons.Truck size={60} className="text-orange-500" /></div>
                    <div className="p-4 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-110 transition-transform relative z-10"><Icons.Truck size={24} /></div>
                    <div className="relative z-10">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Proveedores</p>
                        <h3 className="text-3xl font-bold text-gray-800">{kpiMetrics.total}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5"><Icons.Tag size={60} /></div>
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform relative z-10"><Icons.Tag size={24} /></div>
                    <div className="relative z-10">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Categoría Principal</p>
                        <h3 className="text-2xl font-bold text-gray-800 truncate max-w-[150px]" title={kpiMetrics.topCategory}>{kpiMetrics.topCategory}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5"><Icons.TrendingUp size={60} /></div>
                    <div className="p-4 bg-green-50 text-green-600 rounded-xl group-hover:scale-110 transition-transform relative z-10"><Icons.TrendingUp size={24} /></div>
                    <div className="relative z-10">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Nuevos (Mes)</p>
                        <h3 className="text-3xl font-bold text-gray-800">+{kpiMetrics.newSuppliers}</h3>
                    </div>
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative w-full md:w-96">
                    <Icons.Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por Razón Social, RUC o Categoría..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="w-full md:w-auto bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-gray-200 transition hover:scale-105">
                    <Icons.PlusCircle size={18} /> Nuevo Proveedor
                </button>
            </div>

            {/* SUPPLIERS LIST */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                    <h3 className="font-bold text-gray-800 text-lg">Directorio de Proveedores</h3>
                    <p className="text-sm text-gray-500">Gestión de cadena de suministro y contactos.</p>
                </div>

                {filteredSuppliers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="p-4 pl-6">Proveedor</th>
                                    <th className="p-4">Categoría</th>
                                    <th className="p-4">Contacto Comercial</th>
                                    <th className="p-4">Canales</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSuppliers.map(s => (
                                    <tr key={s.id} className="group hover:bg-orange-50/30 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${getRandomColor(s.name)} shadow-sm`}>
                                                    {getInitials(s.name)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800 text-base">{s.name}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Icons.FileText size={12} className="text-gray-400" />
                                                        <span className="text-xs text-gray-500 font-mono">{s.ruc || 'S/N'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {s.category ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-gray-100 text-gray-600 border border-gray-200">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                                    {s.category}
                                                </span>
                                            ) : <span className="text-gray-300 italic">--</span>}
                                        </td>
                                        <td className="p-4">
                                            {s.contact ? (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <Icons.User size={14} className="text-gray-400" />
                                                    <span className="font-medium">{s.contact}</span>
                                                </div>
                                            ) : <span className="text-gray-300 italic">No registrado</span>}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1.5">
                                                {s.phone && (
                                                    <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-green-600 transition-colors bg-gray-50 hover:bg-green-50 px-2 py-1 rounded border border-gray-100 w-fit">
                                                        <Icons.Phone size={12} /> {s.phone}
                                                    </a>
                                                )}
                                                {s.email && (
                                                    <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded border border-gray-100 w-fit">
                                                        <Icons.Mail size={12} /> {s.email}
                                                    </a>
                                                )}
                                                {!s.phone && !s.email && <span className="text-gray-300 text-xs italic">Sin canales</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(s)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                                                    <Icons.Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                                                    <Icons.Trash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Icons.Truck size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">No se encontraron proveedores</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            {searchTerm ? `No hay resultados para "${searchTerm}"` : "Registra a tus socios estratégicos para gestionar mejor tus compras."}
                        </p>
                        {!searchTerm && (
                            <button onClick={() => setIsModalOpen(true)} className="mt-6 text-orange-600 font-bold hover:underline">
                                Agregar Proveedor ahora
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* --- MODAL (Portal) --- */}
            {isModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in" onClick={handleCloseModal}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 animate-fade-inScale" onClick={e => e.stopPropagation()}>
                        {/* Dark Header with Decoration */}
                        <div className="bg-gray-900 p-6 text-white border-b flex justify-between items-start relative overflow-hidden">
                            <div className="relative z-10">
                                <h4 className="text-xl font-bold flex items-center gap-2">
                                    {editingId ? <Icons.Edit size={20} /> : <Icons.PlusCircle size={20} />}
                                    {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                                </h4>
                                <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                                    <Icons.Truck size={14} />
                                    {editingId ? 'Modifica los datos del proveedor' : 'Registra un nuevo proveedor a tu cadena de suministro'}
                                </p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-lg transition relative z-10">
                                <Icons.X size={20} className="text-white" />
                            </button>
                            {/* Decorative Icon */}
                            <div className="absolute -right-4 -top-4 opacity-10">
                                <Icons.Truck size={100} />
                            </div>
                        </div>

                        {/* Form Content */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-gray-50">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Razón Social</label>
                                    <div className="relative">
                                        <Icons.Building className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-orange-500 font-medium shadow-sm"
                                            placeholder="Ej. Distribuidora Central SAC"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">RUC / ID Fiscal</label>
                                    <div className="relative">
                                        <Icons.FileText className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-orange-500 font-mono shadow-sm"
                                            placeholder="20100000001"
                                            value={ruc}
                                            onChange={e => setRuc(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Categoría</label>
                                    <div className="relative">
                                        <Icons.Tag className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                                            placeholder="Ej. Bebidas, Limpieza"
                                            value={category}
                                            onChange={e => setCategory(e.target.value)}
                                            list="categories"
                                        />
                                        <datalist id="categories">
                                            <option value="Bebidas" />
                                            <option value="Alimentos" />
                                            <option value="Limpieza" />
                                            <option value="Logística" />
                                            <option value="Servicios" />
                                        </datalist>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Información de Contacto</label>
                                    <div className="space-y-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                                        <div className="relative">
                                            <Icons.User className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                            <input
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                                placeholder="Nombre del Vendedor / Contacto"
                                                value={contact}
                                                onChange={e => setContact(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <Icons.Phone className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                                <input
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                                    placeholder="Teléfono"
                                                    value={phone}
                                                    onChange={e => setPhone(e.target.value)}
                                                />
                                            </div>
                                            <div className="relative">
                                                <Icons.Mail className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                                <input
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                                    placeholder="Email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-5 bg-white border-t flex justify-between items-center shadow-[0_-5px_15px_rgba(0,0,0,0.05)] relative z-20">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-4 py-2.5 text-gray-500 hover:text-gray-700 font-medium text-sm transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !name.trim()}
                                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-orange-200 transition-all flex items-center gap-2"
                            >
                                {isSubmitting ? <span className="loader loader-sm"></span> : (editingId ? 'Guardar Cambios' : 'Registrar Proveedor')}
                            </button>
                        </div>

                        {/* Info Footer */}
                        <div className="bg-gray-50 p-3 text-center border-t border-gray-100 text-xs text-gray-400">
                            <Icons.Alert size={12} className="inline mr-1 mb-0.5" />
                            Los datos del proveedor serán utilizados para gestión de compras y reportes.
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
