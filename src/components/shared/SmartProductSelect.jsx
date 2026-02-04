import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { formatCurrency } from '../../lib/utils';

export const SmartProductSelect = ({ products, value, onChange }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // Derived state for better UX
    // If value is passed (product ID), we might want to show the name if query is empty
    // But usually query drives the input. 
    // We can assume the parent controls 'value' but 'query' is local for filtering.

    const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) && p.status !== 'inactive');

    const handleSelect = (prod) => {
        setQuery(prod.name);
        onChange(prod.id);
        setIsOpen(false);
    };

    const handleClear = () => {
        setQuery('');
        onChange('');
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icons.Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="w-full pl-10 pr-10 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Buscar producto..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); onChange(''); }}
                    onFocus={() => setIsOpen(true)}
                />
                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                        <Icons.X size={16} />
                    </button>
                )}
            </div>

            {isOpen && query && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border max-h-60 overflow-y-auto">
                    {filtered.length > 0 ? (
                        filtered.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleSelect(p)}
                                className="w-full text-left p-3 hover:bg-indigo-50 transition border-b last:border-0 flex justify-between items-center group"
                            >
                                <div>
                                    <p className="font-bold text-gray-800 text-sm group-hover:text-indigo-700">{p.name}</p>
                                    <p className="text-xs text-gray-500 flex items-center">
                                        Stock: <span className={`font-bold ml-1 ${p.stock < 5 ? 'text-red-500' : 'text-green-600'}`}>{p.stock}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-indigo-600 text-sm">{formatCurrency(p.price)}</p>
                                    <p className="text-xs text-gray-400">P. Base</p>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">No se encontraron productos</div>
                    )}
                </div>
            )}
        </div>
    );
};
