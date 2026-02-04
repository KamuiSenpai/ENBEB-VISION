import React, { useState, useEffect } from 'react';
import { Icons } from '../components/ui/Icons';
import { FinancialStatements } from '../components/analytics/FinancialStatements';
import { KPIDashboard } from '../components/analytics/KPIDashboard';
import { CustomerIntelligence } from '../components/analytics/CustomerIntelligence';
import { formatCurrency } from '../lib/utils';

export const Analytics = () => {
    const [activeTab, setActiveTab] = useState('kpis');
    const [period, setPeriod] = useState('month');

    // Month/Year selector state
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    // Reference date for filtering
    const referenceDate = new Date(selectedYear, selectedMonth, 15);

    const [salesGoal, setSalesGoal] = useState(() => {
        const saved = localStorage.getItem('enbeb_sales_goal');
        return saved ? parseFloat(saved) : 0;
    });
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [tempGoal, setTempGoal] = useState('');

    const handleSaveGoal = () => {
        const goal = parseFloat(tempGoal) || 0;
        setSalesGoal(goal);
        localStorage.setItem('enbeb_sales_goal', goal.toString());
        setShowGoalModal(false);
    };

    const tabs = [
        { id: 'kpis', label: 'KPIs', icon: <Icons.Activity size={18} />, description: 'Indicadores clave de rendimiento' },
        { id: 'financials', label: 'Estados Financieros', icon: <Icons.FileText size={18} />, description: 'P&L, Flujo de Caja, Balance' },
        { id: 'customers', label: 'Inteligencia de Clientes', icon: <Icons.Users size={18} />, description: 'RFM, Comportamiento, Top Productos' }
    ];

    const periods = [
        { id: 'week', label: 'Semana' },
        { id: 'month', label: 'Mes' },
        { id: 'quarter', label: 'Trimestre' },
        { id: 'year', label: 'Año' }
    ];

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Generate years (last 3 years)
    const years = [];
    for (let y = currentDate.getFullYear(); y >= currentDate.getFullYear() - 2; y--) {
        years.push(y);
    }

    // Check if viewing current period
    const isCurrentPeriod = selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear();

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                            <Icons.Activity size={24} />
                        </div>
                        Inteligencia de Negocios
                    </h1>
                    <p className="text-gray-500 mt-1">Estados financieros, KPIs y análisis de clientes</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Month/Year Selector */}
                    <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100 flex items-center gap-2">
                        <Icons.Calendar size={18} className="text-gray-400 ml-2" />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="px-3 py-2 bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
                        >
                            {months.map((m, idx) => (
                                <option key={idx} value={idx}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="px-3 py-2 bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        {!isCurrentPeriod && (
                            <button
                                onClick={() => { setSelectedMonth(currentDate.getMonth()); setSelectedYear(currentDate.getFullYear()); }}
                                className="px-2 py-1 text-xs bg-indigo-100 text-indigo-600 rounded-lg font-bold hover:bg-indigo-200 transition"
                            >
                                Hoy
                            </button>
                        )}
                    </div>

                    {/* Period Type Selector */}
                    <div className="bg-white rounded-xl p-1 shadow-sm border border-gray-100 flex">
                        {periods.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${period === p.id
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Goal Config */}
                    <button
                        onClick={() => { setTempGoal(salesGoal.toString()); setShowGoalModal(true); }}
                        className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                        title="Configurar Meta"
                    >
                        <Icons.Target size={20} />
                    </button>
                </div>
            </div>

            {/* Period Indicator */}
            {!isCurrentPeriod && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                    <Icons.Clock size={18} className="text-amber-600" />
                    <span className="text-amber-800 font-medium text-sm">
                        Viendo datos de: <strong>{months[selectedMonth]} {selectedYear}</strong>
                    </span>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex gap-2 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[180px] p-4 rounded-xl transition-all text-left ${activeTab === tab.id
                                ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200'
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                {tab.icon}
                            </div>
                            <div>
                                <p className={`font-bold ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-700'}`}>
                                    {tab.label}
                                </p>
                                <p className="text-xs text-gray-400">{tab.description}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {activeTab === 'kpis' && <KPIDashboard period={period} salesGoal={salesGoal} referenceDate={referenceDate} />}
                {activeTab === 'financials' && <FinancialStatements period={period} referenceDate={referenceDate} />}
                {activeTab === 'customers' && <CustomerIntelligence />}
            </div>

            {/* Goal Configuration Modal */}
            {showGoalModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowGoalModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-inScale" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Icons.Target size={20} /> Configurar Meta de Ventas
                            </h3>
                            <p className="text-indigo-200 text-sm mt-1">Define tu meta mensual para hacer seguimiento</p>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Meta Mensual (S/)</label>
                            <input
                                type="number"
                                value={tempGoal}
                                onChange={(e) => setTempGoal(e.target.value)}
                                placeholder="Ej: 50000"
                                className="w-full p-4 border border-gray-200 rounded-xl text-lg font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                            {tempGoal && (
                                <p className="text-center text-gray-500 text-sm mt-2">
                                    Meta: {formatCurrency(parseFloat(tempGoal) || 0)}
                                </p>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setShowGoalModal(false)}
                                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveGoal}
                                className="flex-1 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

