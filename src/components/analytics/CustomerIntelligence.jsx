import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { Icons } from '../ui/Icons';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useData } from '../../context/DataContext';
import { calculateCustomerRFM } from '../../lib/analytics';

export const CustomerIntelligence = () => {
    const { clients, sales } = useData();
    const [selectedSegment, setSelectedSegment] = useState('all');
    const [viewingClient, setViewingClient] = useState(null);

    // Calculate RFM
    const customerData = useMemo(() => calculateCustomerRFM(clients, sales), [clients, sales]);

    // Segment counts
    const segmentStats = useMemo(() => {
        const stats = {
            Champions: { count: 0, value: 0, color: 'emerald', icon: '🏆' },
            Loyal: { count: 0, value: 0, color: 'blue', icon: '💎' },
            Promising: { count: 0, value: 0, color: 'purple', icon: '🌱' },
            Regular: { count: 0, value: 0, color: 'slate', icon: '👤' },
            'At Risk': { count: 0, value: 0, color: 'amber', icon: '⚠️' },
            Lost: { count: 0, value: 0, color: 'rose', icon: '👻' }
        };

        customerData.forEach(c => {
            if (stats[c.segment]) {
                stats[c.segment].count++;
                stats[c.segment].value += c.monetary;
            }
        });

        return stats;
    }, [customerData]);

    // Filter by segment
    const filteredClients = useMemo(() => {
        if (selectedSegment === 'all') return customerData;
        return customerData.filter(c => c.segment === selectedSegment);
    }, [customerData, selectedSegment]);

    const getSegmentBadge = (segment) => {
        const colors = {
            Champions: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            Loyal: 'bg-blue-100 text-blue-700 border-blue-200',
            Promising: 'bg-purple-100 text-purple-700 border-purple-200',
            Regular: 'bg-slate-100 text-slate-700 border-slate-200',
            'At Risk': 'bg-amber-100 text-amber-700 border-amber-200',
            Lost: 'bg-rose-100 text-rose-700 border-rose-200'
        };
        const icons = {
            Champions: '🏆',
            Loyal: '💎',
            Promising: '🌱',
            Regular: '👤',
            'At Risk': '⚠️',
            Lost: '👻'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${colors[segment]}`}>
                {icons[segment]} {segment}
            </span>
        );
    };

    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up': return <span className="text-emerald-500 font-bold">↑</span>;
            case 'down': return <span className="text-rose-500 font-bold">↓</span>;
            case 'new': return <span className="text-purple-500 font-bold">★</span>;
            default: return <span className="text-gray-400">—</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Segment Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(segmentStats).map(([segment, data]) => (
                    <button
                        key={segment}
                        onClick={() => setSelectedSegment(selectedSegment === segment ? 'all' : segment)}
                        className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-md ${selectedSegment === segment
                                ? `border-${data.color}-500 bg-${data.color}-50 ring-2 ring-${data.color}-200`
                                : 'border-gray-100 bg-white hover:border-gray-200'
                            }`}
                    >
                        <div className="text-2xl mb-2">{data.icon}</div>
                        <p className="font-bold text-gray-800 text-sm">{segment}</p>
                        <p className="text-2xl font-bold text-gray-900">{data.count}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatCurrency(data.value)}</p>
                    </button>
                ))}
            </div>

            {/* Filter indicator */}
            {selectedSegment !== 'all' && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Filtrando por:</span>
                    {getSegmentBadge(selectedSegment)}
                    <button
                        onClick={() => setSelectedSegment('all')}
                        className="text-gray-400 hover:text-gray-600 underline text-xs"
                    >
                        Ver todos
                    </button>
                </div>
            )}

            {/* Client Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Icons.Users size={20} className="text-indigo-500" />
                        Análisis de Clientes ({filteredClients.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                            <tr>
                                <th className="p-4 text-left">Cliente</th>
                                <th className="p-4 text-center">Segmento</th>
                                <th className="p-4 text-center">Recencia</th>
                                <th className="p-4 text-center">Frecuencia</th>
                                <th className="p-4 text-right">LTV</th>
                                <th className="p-4 text-right">Ticket Prom.</th>
                                <th className="p-4 text-center">Tendencia</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredClients.slice(0, 20).map(client => (
                                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-800">{client.name}</div>
                                        <div className="text-xs text-gray-400">{client.phone || 'Sin teléfono'}</div>
                                    </td>
                                    <td className="p-4 text-center">{getSegmentBadge(client.segment)}</td>
                                    <td className="p-4 text-center">
                                        <span className={`font-mono font-bold ${client.recency <= 30 ? 'text-emerald-600' :
                                                client.recency <= 60 ? 'text-amber-600' : 'text-rose-600'
                                            }`}>
                                            {client.recency === 999 ? '—' : `${client.recency}d`}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-bold">
                                            {client.frequency}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-gray-800">
                                        {formatCurrency(client.monetary)}
                                    </td>
                                    <td className="p-4 text-right text-gray-600">
                                        {formatCurrency(client.avgTicket)}
                                    </td>
                                    <td className="p-4 text-center text-lg">
                                        {getTrendIcon(client.trend)}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => setViewingClient(client)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                        >
                                            <Icons.Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredClients.length > 20 && (
                    <div className="p-4 bg-gray-50 text-center text-sm text-gray-500">
                        Mostrando 20 de {filteredClients.length} clientes
                    </div>
                )}
            </div>

            {/* Client Detail Modal */}
            {viewingClient && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setViewingClient(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-inScale" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative overflow-hidden">
                            <button onClick={() => setViewingClient(null)} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition">
                                <Icons.X size={20} />
                            </button>
                            <div className="absolute -right-8 -top-8 opacity-10"><Icons.User size={120} /></div>
                            <h3 className="text-xl font-bold relative z-10">{viewingClient.name}</h3>
                            <p className="text-indigo-200 text-sm mt-1">{viewingClient.phone || 'Sin teléfono'}</p>
                            <div className="mt-4 flex gap-2">
                                {getSegmentBadge(viewingClient.segment)}
                                <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-bold">
                                    Score: {viewingClient.rfmScore.toFixed(0)}
                                </span>
                            </div>
                        </div>

                        {/* Metrics */}
                        <div className="p-6 border-b border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Métricas RFM</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl text-center">
                                    <p className="text-gray-500 text-xs font-bold uppercase">Recencia</p>
                                    <p className="text-2xl font-bold mt-1">{viewingClient.recency}d</p>
                                    <p className="text-xs text-gray-400">desde última compra</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl text-center">
                                    <p className="text-gray-500 text-xs font-bold uppercase">Frecuencia</p>
                                    <p className="text-2xl font-bold mt-1">{viewingClient.frequency}</p>
                                    <p className="text-xs text-gray-400">compras totales</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl text-center">
                                    <p className="text-gray-500 text-xs font-bold uppercase">Monto (LTV)</p>
                                    <p className="text-2xl font-bold mt-1">{formatCurrency(viewingClient.monetary)}</p>
                                    <p className="text-xs text-gray-400">total histórico</p>
                                </div>
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="p-6">
                            <h4 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Icons.Star size={16} className="text-amber-500" /> Productos Más Comprados
                            </h4>
                            {viewingClient.topProducts.length > 0 ? (
                                <div className="space-y-2">
                                    {viewingClient.topProducts.map((prod, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                                        idx === 1 ? 'bg-gray-200 text-gray-600' :
                                                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                                'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="font-medium text-gray-800">{prod.productName}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-gray-800">{prod.qty} uds</span>
                                                <span className="text-xs text-gray-400 ml-2">{formatCurrency(prod.revenue)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm text-center p-4">Sin historial de productos</p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 flex justify-between items-center border-t">
                            <span className="text-xs text-gray-400">
                                Última compra: {viewingClient.lastPurchase ? formatDate(viewingClient.lastPurchase) : 'Nunca'}
                            </span>
                            <button onClick={() => setViewingClient(null)} className="text-gray-500 font-bold text-sm hover:text-gray-800 transition">
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
