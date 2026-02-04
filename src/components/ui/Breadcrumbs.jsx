import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Icons } from './Icons';

/**
 * Breadcrumbs - Dynamic navigation breadcrumbs
 * Automatically generates based on current route
 */

const routeConfig = {
    '/': { label: 'Dashboard', icon: Icons.Dashboard },
    '/sales': { label: 'Ventas', icon: Icons.Cart },
    '/purchases': { label: 'Compras', icon: Icons.ShoppingBag },
    '/inventory': { label: 'Inventario', icon: Icons.Package },
    '/expenses': { label: 'Gastos', icon: Icons.Wallet },
    '/reports': { label: 'Reportes', icon: Icons.FileText },
    '/analytics': { label: 'Analytics', icon: Icons.Activity },
    '/clients': { label: 'Clientes', icon: Icons.Users },
    '/suppliers': { label: 'Proveedores', icon: Icons.Truck },
    '/invoice-upload': { label: 'Escanear Facturas', icon: Icons.Camera }
};

export const Breadcrumbs = ({ className = '' }) => {
    const location = useLocation();
    const pathSegments = location.pathname.split('/').filter(Boolean);

    // Build breadcrumb items
    const items = [];

    // Always add home
    items.push({
        path: '/',
        label: 'Inicio',
        icon: Icons.Dashboard,
        isLast: pathSegments.length === 0
    });

    // Add current page if not home
    if (pathSegments.length > 0) {
        const currentPath = `/${pathSegments.join('/')}`;
        const config = routeConfig[currentPath] || { label: pathSegments[pathSegments.length - 1], icon: Icons.Help };
        items.push({
            path: currentPath,
            label: config.label,
            icon: config.icon,
            isLast: true
        });
    }

    // On home page, just show "Panel de Control" label
    if (items.length <= 1 && location.pathname === '/') {
        return (
            <nav className={`flex items-center text-sm ${className}`} aria-label="Breadcrumb">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Icons.Dashboard size={14} className="text-indigo-500" />
                    Panel de Control
                </span>
            </nav>
        );
    }

    return (
        <nav className={`flex items-center text-sm ${className}`} aria-label="Breadcrumb">
            <ol className="flex items-center gap-1">
                {items.map((item, index) => (
                    <li key={item.path} className="flex items-center">
                        {index > 0 && (
                            <Icons.ArrowUp
                                size={14}
                                className="mx-2 text-slate-300 rotate-90"
                            />
                        )}
                        {item.isLast ? (
                            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                                <item.icon size={14} className="text-indigo-500" />
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                to={item.path}
                                className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                <item.icon size={14} />
                                {item.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
