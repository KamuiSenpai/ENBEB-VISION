import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/ui/Icons';
import { formatCurrency, formatDate } from '../lib/utils';
import { db, appId } from '../lib/firebase';
import { collection, addDoc, deleteDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

export const Expenses = () => {
    const { expenses, showNotification } = useData();
    const { user } = useAuth();

    // --- STATES ---
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Operativo');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const categories = ['Operativo', 'Administrativo', 'Marketing', 'Logística', 'Personal', 'Movilidad', 'Otros'];
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#6b7280'];

    // --- DATA PROCESSING ---
    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const d = new Date(e.date);
            // Handle timezone offset simply by reading local dates if needed, but usually strict comparison works for Y/M
            // To ignore timezone issues with string dates (YYYY-MM-DD), we parse parts manually or use UTC methods
            // Simplest for now: string split
            const [y, m] = e.date.split('-');
            return parseInt(y) === selectedYear && (parseInt(m) - 1) === selectedMonth;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [expenses, selectedMonth, selectedYear]);

    const kpiMetrics = useMemo(() => {
        const total = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const currentDay = new Date().getMonth() === selectedMonth ? new Date().getDate() : daysInMonth;
        const dailyAvg = total / (currentDay || 1);

        // Category Breakdown
        const catMap = {};
        filteredExpenses.forEach(e => {
            const c = e.category || 'Otros';
            catMap[c] = (catMap[c] || 0) + e.amount;
        });

        const catData = Object.keys(catMap).map(name => ({ name, value: catMap[name] }));
        const topCat = catData.sort((a, b) => b.value - a.value)[0] || { name: '-', value: 0 };

        // Daily Trend Data
        const dayMap = {};
        filteredExpenses.forEach(e => {
            const day = parseInt(e.date.split('-')[2]);
            dayMap[day] = (dayMap[day] || 0) + e.amount;
        });
        const trendData = Array.from({ length: daysInMonth }, (_, i) => ({
            day: i + 1,
            amount: dayMap[i + 1] || 0
        }));

        return { total, dailyAvg, topCat, catData, trendData };
    }, [filteredExpenses, selectedMonth, selectedYear]);


    // --- ACTIONS ---
    const handleEdit = (expense) => {
        setEditingId(expense.id);
        setDesc(expense.description);
        setAmount(expense.amount);
        setCategory(expense.category);
        setDate(expense.date);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setDesc(''); setAmount(''); setCategory('Operativo'); setDate(new Date().toISOString().split('T')[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const expenseData = {
                description: desc,
                amount: parseFloat(amount),
                category,
                date,
                updatedAt: Timestamp.now()
            };

            if (editingId) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', editingId), expenseData);
                showNotification("Gasto actualizado.", "success");
            } else {
                expenseData.createdAt = Timestamp.now();
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), expenseData);
                showNotification("Gasto registrado.", "success");
            }
            handleCloseModal();
        } catch (e) {
            showNotification("Error al guardar.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este registro?")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', id));
            showNotification("Gasto eliminado.", "success");
        } catch (e) {
            showNotification("Error al eliminar.", 'error');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative pb-10">

            {/* HEADER & FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-xl"><Icons.Wallet size={24} /></div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Gastos Operativos</h2>
                        <p className="text-xs text-gray-500">Control Financiero y Presupuestal</p>
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500">
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i} value={i}>{new Date(2000, i, 1).toLocaleString('es-ES', { month: 'long' }).toUpperCase()}</option>
                        ))}
                    </select>
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition transform hover:scale-105">
                        <Icons.Plus size={18} /> Nuevo Gasto
                    </button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-20"><Icons.Dollar size={80} /></div>
                    <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">Gasto Total ({new Date(selectedYear, selectedMonth).toLocaleDateString('es-ES', { month: 'long' })})</p>
                    <h3 className="text-4xl font-bold">{formatCurrency(kpiMetrics.total)}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-5 text-gray-400"><Icons.Activity size={60} /></div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Promedio Diario</p>
                    <h3 className="text-3xl font-bold text-gray-800">{formatCurrency(kpiMetrics.dailyAvg)}</h3>
                    <p className="text-xs text-gray-400 mt-2">Tendencia de consumo</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-5 text-gray-400"><Icons.PieChart size={60} /></div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Mayor Categoría</p>
                    <h3 className="text-2xl font-bold text-gray-800 truncate" title={kpiMetrics.topCat.name}>{kpiMetrics.topCat.name}</h3>
                    <p className="text-sm font-bold text-red-500 mt-1">{formatCurrency(kpiMetrics.topCat.value)}</p>
                </div>
            </div>

            {/* ANALYTICS & CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart 1: Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 min-h-[300px]">
                    <h4 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                        <Icons.PieChart size={18} className="text-gray-400" /> Distribución de Gastos
                    </h4>
                    <div className="h-64">
                        {kpiMetrics.catData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={kpiMetrics.catData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {kpiMetrics.catData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-gray-300 text-sm">Sin datos para mostrar</div>}
                    </div>
                </div>

                {/* Chart 2: Daily Trend */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 min-h-[300px]">
                    <h4 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                        <Icons.BarChart size={18} className="text-gray-400" /> Flujo Diario de Egresos
                    </h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={kpiMetrics.trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(value) => `S/${value}`} />
                                <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="amount" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* TRANSACTIONS TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Detalle de Movimientos</h3>
                    <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{filteredExpenses.length} Registros</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-4 pl-6">Fecha</th>
                                <th className="p-4">Categoría</th>
                                <th className="p-4">Descripción</th>
                                <th className="p-4 text-right">Monto</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredExpenses.map(e => (
                                <tr key={e.id} className="hover:bg-gray-50/50 transition">
                                    <td className="p-4 pl-6 text-gray-500 font-medium whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-gray-100 rounded text-gray-400"><Icons.Calendar size={14} /></div>
                                            {formatDate(e.date)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${e.category === 'Operativo' ? 'bg-blue-50 text-blue-600' :
                                            e.category === 'Marketing' ? 'bg-orange-50 text-orange-600' :
                                                e.category === 'Movilidad' ? 'bg-cyan-50 text-cyan-600' :
                                                    e.category === 'Personal' ? 'bg-purple-50 text-purple-600' :
                                                        'bg-gray-100 text-gray-600'
                                            }`}>
                                            {e.category}
                                        </span>
                                    </td>
                                    <td className="p-4 font-medium text-gray-800">{e.description}</td>
                                    <td className="p-4 text-right font-mono font-bold text-red-600">{formatCurrency(e.amount)}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => handleEdit(e)} className="p-2 text-gray-300 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title="Editar">
                                                <Icons.Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                                                <Icons.Trash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredExpenses.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-gray-400">
                                        <Icons.Inbox size={48} className="mx-auto mb-3 opacity-20" />
                                        <p>No hay gastos registrados en este periodo.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- NEW EXPENSE MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleCloseModal}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-inScale" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                {editingId ? <Icons.Edit size={20} /> : <Icons.PlusCircle size={20} />}
                                {editingId ? 'Editar Gasto' : 'Nuevo Gasto'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-white/80 hover:text-white transition"><Icons.X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Descripción</label>
                                    <input className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-red-500 font-medium" placeholder="Ej. Pago de Luz" value={desc} onChange={e => setDesc(e.target.value)} required autoFocus />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Monto</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-gray-400 text-sm">S/</span>
                                            <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 pl-8 text-sm outline-none focus:ring-2 focus:ring-red-500 font-bold" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha</label>
                                        <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-red-500" value={date} onChange={e => setDate(e.target.value)} required />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Categoría</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {categories.map(cat => (
                                            <button type="button" key={cat} onClick={() => setCategory(cat)} className={`text-xs font-bold py-2 px-3 rounded-lg border transition ${category === cat ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full bg-gray-900 hover:bg-black text-white py-3.5 rounded-xl font-bold shadow-lg shadow-gray-200 transition-all mt-4 flex items-center justify-center gap-2">
                                    {isSubmitting ? <span className="loader"></span> : (editingId ? 'Guardar Cambios' : 'Registrar Egreso')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
