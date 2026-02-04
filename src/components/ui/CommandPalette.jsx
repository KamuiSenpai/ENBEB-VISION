import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { Icons } from './Icons';
import { useData } from '../../context/DataContext';

/**
 * CommandPalette - Global search and quick actions (Ctrl+K / Cmd+K)
 */

const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', description: 'Panel de control', path: '/', icon: Icons.Dashboard, category: 'Navegación' },
    { id: 'sales', label: 'Ventas', description: 'Terminal de ventas', path: '/sales', icon: Icons.Cart, category: 'Navegación' },
    { id: 'purchases', label: 'Compras', description: 'Gestión de compras', path: '/purchases', icon: Icons.ShoppingBag, category: 'Navegación' },
    { id: 'inventory', label: 'Inventario', description: 'Stock y productos', path: '/inventory', icon: Icons.Package, category: 'Navegación' },
    { id: 'expenses', label: 'Gastos', description: 'Gastos operativos', path: '/expenses', icon: Icons.Wallet, category: 'Navegación' },
    { id: 'reports', label: 'Reportes', description: 'Informes y análisis', path: '/reports', icon: Icons.FileText, category: 'Navegación' },
    { id: 'analytics', label: 'Analytics', description: 'Inteligencia de negocios', path: '/analytics', icon: Icons.Activity, category: 'Navegación' },
    { id: 'clients', label: 'Clientes', description: 'Cartera de clientes', path: '/clients', icon: Icons.Users, category: 'Navegación' },
    { id: 'suppliers', label: 'Proveedores', description: 'Directorio proveedores', path: '/suppliers', icon: Icons.Truck, category: 'Navegación' },
    { id: 'invoice-upload', label: 'Escanear Facturas', description: 'OCR de facturas', path: '/invoice-upload', icon: Icons.Camera, category: 'Navegación' },
];

const quickActions = [
    { id: 'new-sale', label: 'Nueva Venta', description: 'Registrar venta rápida', path: '/sales', icon: Icons.Plus, category: 'Acciones Rápidas' },
    { id: 'new-product', label: 'Nuevo Producto', description: 'Agregar al inventario', path: '/inventory', icon: Icons.Plus, category: 'Acciones Rápidas' },
    { id: 'new-expense', label: 'Registrar Gasto', description: 'Agregar gasto operativo', path: '/expenses', icon: Icons.Plus, category: 'Acciones Rápidas' },
    { id: 'scan-invoice', label: 'Escanear Factura', description: 'OCR automático', path: '/invoice-upload', icon: Icons.Camera, category: 'Acciones Rápidas' },
];

export const CommandPalette = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const navigate = useNavigate();
    const { products, clients } = useData();

    // Build search items
    const allItems = useMemo(() => {
        const items = [...quickActions, ...navigationItems];

        // Add products (limit to 5 for performance)
        const topProducts = products.slice(0, 50).map(p => ({
            id: `product-${p.id}`,
            label: p.name,
            description: `Stock: ${p.stock} | ${p.category || 'Sin categoría'}`,
            path: '/inventory',
            icon: Icons.Package,
            category: 'Productos'
        }));

        // Add clients (limit to 5)
        const topClients = clients.slice(0, 30).map(c => ({
            id: `client-${c.id}`,
            label: c.name,
            description: c.phone || c.email || 'Sin contacto',
            path: '/clients',
            icon: Icons.User,
            category: 'Clientes'
        }));

        return [...items, ...topProducts, ...topClients];
    }, [products, clients]);

    // Filter items based on query
    const filteredItems = useMemo(() => {
        if (!query.trim()) {
            return [...quickActions, ...navigationItems];
        }

        const lowerQuery = query.toLowerCase();
        return allItems.filter(item =>
            item.label.toLowerCase().includes(lowerQuery) ||
            item.description.toLowerCase().includes(lowerQuery) ||
            item.category.toLowerCase().includes(lowerQuery)
        );
    }, [query, allItems]);

    // Group items by category
    const groupedItems = useMemo(() => {
        const groups = {};
        filteredItems.forEach(item => {
            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category].push(item);
        });
        return groups;
    }, [filteredItems]);

    // Flat list for keyboard navigation
    const flatList = useMemo(() => filteredItems, [filteredItems]);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, flatList.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (flatList[selectedIndex]) {
                        handleSelect(flatList[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, flatList, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    const handleSelect = (item) => {
        navigate(item.path);
        onClose();
    };

    if (!isOpen) return null;

    let itemIndex = -1;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[15vh] p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
                    <Icons.Search size={20} className="text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Buscar páginas, productos, clientes..."
                        className="flex-1 text-base outline-none placeholder-slate-400"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-mono text-slate-400 bg-slate-100 rounded">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
                    {Object.entries(groupedItems).map(([category, items]) => (
                        <div key={category} className="mb-2">
                            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {category}
                            </div>
                            {items.map((item) => {
                                itemIndex++;
                                const isSelected = itemIndex === selectedIndex;
                                const currentIndex = itemIndex;

                                return (
                                    <button
                                        key={item.id}
                                        data-index={currentIndex}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isSelected
                                                ? 'bg-indigo-50 text-indigo-700'
                                                : 'hover:bg-slate-50 text-slate-700'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                                            <item.icon size={16} className={isSelected ? 'text-indigo-600' : 'text-slate-500'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{item.label}</div>
                                            <div className="text-xs text-slate-400 truncate">{item.description}</div>
                                        </div>
                                        {isSelected && (
                                            <Icons.ArrowUp size={14} className="text-indigo-400 rotate-90" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}

                    {filteredItems.length === 0 && (
                        <div className="py-12 text-center">
                            <Icons.Search size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-slate-500 text-sm">No se encontraron resultados</p>
                            <p className="text-slate-400 text-xs">Intenta con otro término</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white rounded border text-[10px]">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-white rounded border text-[10px]">↓</kbd>
                            navegar
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white rounded border text-[10px]">↵</kbd>
                            seleccionar
                        </span>
                    </div>
                    <span className="text-indigo-500 font-medium">ENBEB Vision</span>
                </div>
            </div>
        </div>,
        document.body
    );
};

/**
 * Hook to manage Command Palette state
 */
export const useCommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(prev => !prev)
    };
};

export default CommandPalette;
