import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/ui/Icons';
import { db, appId } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';

export const Clients = () => {
    const { clients, showNotification } = useData();
    const { user } = useAuth();

    // --- STATES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState('Persona Natural');
    const [ruc, setRuc] = useState('');
    const [contact, setContact] = useState('');
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState(''); // Added email for completeness if needed, or stick to contact
    const [businessType, setBusinessType] = useState(''); // New state for 'Giro de Negocio'

    // --- HELPERS ---
    const getInitials = (name) => {
        return name
            ? name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
            : 'CN';
    };

    const getRandomColor = (name) => {
        const colors = ['bg-red-100 text-red-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-orange-100 text-orange-600', 'bg-indigo-100 text-indigo-600'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // --- DATA PROCESSING ---
    const filteredClients = useMemo(() => {
        return clients.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.ruc && c.ruc.includes(searchTerm)) ||
            (c.contact && c.contact.includes(searchTerm))
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, searchTerm]);

    const kpiMetrics = useMemo(() => {
        const total = clients.length;
        const empresas = clients.filter(c => c.type === 'Empresa').length;
        const personas = clients.filter(c => c.type === 'Persona Natural').length;

        // New clients this month (assuming createdAt exists, fallback to all if not)
        const now = new Date();
        const newClients = clients.filter(c => {
            if (!c.createdAt) return false;
            const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;

        return { total, empresas, personas, newClients };
    }, [clients]);

    // --- ACTIONS ---
    const handleEdit = (c) => {
        setEditingId(c.id);
        setName(c.name);
        setType(c.type || 'Persona Natural');
        setBusinessType(c.businessType || '');
        setRuc(c.ruc || '');
        setContact(c.contact || '');
        setAddress(c.address || '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setName(''); setType('Persona Natural'); setBusinessType(''); setRuc(''); setContact(''); setAddress('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = {
                name,
                type,
                businessType: type === 'Empresa' ? businessType : '', // Only save if type is Empresa
                ruc,
                contact,
                address,
                updatedAt: Timestamp.now()
            };

            if (editingId) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', editingId), data);
                showNotification("Cliente actualizado correctamente.", "success");
            } else {
                data.createdAt = Timestamp.now();
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'clients'), data);
                showNotification("Cliente creado y añadido a la cartera.", "success");
            }
            handleCloseModal();
        } catch (e) {
            showNotification("Hubo un error al guardar.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', id));
            showNotification("Cliente eliminado de la base de datos.", "success");
        } catch (e) {
            showNotification("Error al eliminar el cliente.", 'error');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">

            {/* KPI STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><Icons.Users size={24} /></div>
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Clientes</p>
                        <h3 className="text-2xl font-bold text-gray-800">{kpiMetrics.total}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform"><Icons.Building size={24} /></div>
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Empresas</p>
                        <h3 className="text-2xl font-bold text-gray-800">{kpiMetrics.empresas}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
                    <div className="p-4 bg-green-50 text-green-600 rounded-xl group-hover:scale-110 transition-transform"><Icons.User size={24} /></div>
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Personas</p>
                        <h3 className="text-2xl font-bold text-gray-800">{kpiMetrics.personas}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
                    <div className="p-4 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-110 transition-transform"><Icons.TrendingUp size={24} /></div>
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Nuevos</p>
                        <h3 className="text-2xl font-bold text-gray-800">+{kpiMetrics.newClients}</h3>
                    </div>
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative w-full md:w-96">
                    <Icons.Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, RUC o teléfono..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition hover:scale-105">
                    <Icons.PlusCircle size={18} /> Nuevo Cliente
                </button>
            </div>

            {/* CLIENTS LIST */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                    <h3 className="font-bold text-gray-800 text-lg">Directorio de Clientes</h3>
                    <p className="text-sm text-gray-500">Gestiona tu cartera de clientes y contactos.</p>
                </div>

                {filteredClients.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="p-4 pl-6">Cliente / Razón Social</th>
                                    <th className="p-4">Identificación</th>
                                    <th className="p-4">Contacto</th>
                                    <th className="p-4">Ubicación</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredClients.map(c => (
                                    <tr key={c.id} className="group hover:bg-blue-50/30 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${getRandomColor(c.name)} border-2 border-white shadow-sm ring-1 ring-gray-100`}>
                                                    {getInitials(c.name)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{c.name}</div>
                                                    <div className="flex gap-1 mt-1">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${c.type === 'Empresa' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                            {c.type === 'Empresa' ? <Icons.Building size={10} /> : <Icons.User size={10} />}
                                                            {c.type}
                                                        </span>
                                                        {c.type === 'Empresa' && c.businessType && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border bg-gray-100 text-gray-600 border-gray-200">
                                                                <Icons.Tag size={10} /> {c.businessType}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg w-fit border border-gray-100">
                                                <Icons.FileText size={14} className="text-gray-400" />
                                                <span className="font-mono text-sm font-medium">{c.ruc || 'S/N'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {c.contact ? (
                                                <div className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
                                                    <Icons.Phone size={14} />
                                                    <span className="font-medium">{c.contact}</span>
                                                </div>
                                            ) : <span className="text-gray-300 italic">No registrado</span>}
                                        </td>
                                        <td className="p-4">
                                            {c.address ? (
                                                <div className="flex items-start gap-2 text-gray-500 max-w-[200px]">
                                                    <Icons.MapPin size={14} className="mt-0.5 shrink-0" />
                                                    <span className="truncate" title={c.address}>{c.address}</span>
                                                </div>
                                            ) : <span className="text-gray-300 italic">--</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(c)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                                                    <Icons.Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(c.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
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
                            <Icons.Search size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">No se encontraron clientes</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            {searchTerm ? `No hay resultados para "${searchTerm}"` : "Comienza agregando tu primer cliente a la base de datos."}
                        </p>
                        {!searchTerm && (
                            <button onClick={() => setIsModalOpen(true)} className="mt-6 text-blue-600 font-bold hover:underline">
                                Agregar Cliente ahora
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
                                    {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
                                </h4>
                                <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                                    <Icons.Users size={14} />
                                    {editingId ? 'Modifica los datos del cliente' : 'Agrega un nuevo cliente a tu cartera'}
                                </p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-lg transition relative z-10">
                                <Icons.X size={20} className="text-white" />
                            </button>
                            {/* Decorative Icon */}
                            <div className="absolute -right-4 -top-4 opacity-10">
                                <Icons.Users size={100} />
                            </div>
                        </div>

                        {/* Form Content */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-gray-50">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Nombre Completo / Razón Social</label>
                                    <div className="relative">
                                        <Icons.User className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm"
                                            placeholder="Ej. Juan Pérez o Distribuidora SAC"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className={type === 'Empresa' ? '' : 'col-span-2'}>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Tipo de Cliente</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium shadow-sm"
                                            value={type}
                                            onChange={e => setType(e.target.value)}
                                        >
                                            <option value="Persona Natural">Persona Natural</option>
                                            <option value="Empresa">Empresa</option>
                                        </select>
                                        <div className="absolute right-3 top-3.5 text-gray-400 pointer-events-none">
                                            <Icons.ArrowDown size={14} />
                                        </div>
                                    </div>
                                </div>

                                {type === 'Empresa' && (
                                    <div className="animate-fade-in">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Giro de Negocio</label>
                                        <div className="relative">
                                            <select
                                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium shadow-sm"
                                                value={businessType}
                                                onChange={e => setBusinessType(e.target.value)}
                                            >
                                                <option value="">Seleccionar Giro</option>
                                                <option value="Fast Food">Fast Food</option>
                                                <option value="Restaurante">Restaurante</option>
                                                <option value="Negocio">Negocio</option>
                                                <option value="Otro">Otro</option>
                                            </select>
                                            <div className="absolute right-3 top-3.5 text-gray-400 pointer-events-none">
                                                <Icons.ArrowDown size={14} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">RUC / DNI</label>
                                    <div className="relative">
                                        <Icons.FileText className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-sm"
                                            placeholder="00000000"
                                            value={ruc}
                                            onChange={e => setRuc(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Teléfono / Celular</label>
                                    <div className="relative">
                                        <Icons.Phone className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="999 000 000"
                                            value={contact}
                                            onChange={e => setContact(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Dirección</label>
                                    <div className="relative">
                                        <Icons.MapPin className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input
                                            className="w-full bg-white border border-gray-200 rounded-xl p-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="Av. Principal 123"
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                        />
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
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                            >
                                {isSubmitting ? <span className="loader loader-sm"></span> : (editingId ? 'Guardar Cambios' : 'Registrar Cliente')}
                            </button>
                        </div>

                        {/* Info Footer */}
                        <div className="bg-gray-50 p-3 text-center border-t border-gray-100 text-xs text-gray-400">
                            <Icons.Alert size={12} className="inline mr-1 mb-0.5" />
                            Los datos del cliente serán utilizados para generar facturas y reportes.
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
