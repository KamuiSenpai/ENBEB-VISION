import React from 'react';
import { Icons } from './Icons';

/**
 * EmptyState - Display when no data is available
 * Provides context and optional action to users
 */
export const EmptyState = ({
    icon: Icon = Icons.Package,
    title = 'No hay datos',
    description = 'No se encontraron registros para mostrar.',
    action = null, // { label: string, onClick: function, icon?: Component }
    variant = 'default', // 'default' | 'search' | 'error' | 'success'
    size = 'md', // 'sm' | 'md' | 'lg'
    className = ''
}) => {
    const sizeClasses = {
        sm: { container: 'py-6', icon: 32, title: 'text-sm', desc: 'text-xs' },
        md: { container: 'py-12', icon: 48, title: 'text-base', desc: 'text-sm' },
        lg: { container: 'py-16', icon: 64, title: 'text-lg', desc: 'text-base' }
    };

    const variantStyles = {
        default: {
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-400',
            titleColor: 'text-slate-600'
        },
        search: {
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-400',
            titleColor: 'text-slate-700'
        },
        error: {
            iconBg: 'bg-red-50',
            iconColor: 'text-red-400',
            titleColor: 'text-red-600'
        },
        success: {
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-400',
            titleColor: 'text-emerald-600'
        }
    };

    const { container, icon: iconSize, title: titleClass, desc: descClass } = sizeClasses[size];
    const { iconBg, iconColor, titleColor } = variantStyles[variant];

    return (
        <div className={`flex flex-col items-center justify-center text-center ${container} ${className}`}>
            {/* Icon Container */}
            <div className={`${iconBg} ${iconColor} p-4 rounded-2xl mb-4 animate-fade-in`}>
                <Icon size={iconSize} strokeWidth={1.5} />
            </div>

            {/* Title */}
            <h3 className={`font-semibold ${titleColor} ${titleClass} mb-1 animate-fade-in animation-delay-100`}>
                {title}
            </h3>

            {/* Description */}
            <p className={`text-slate-400 ${descClass} max-w-sm animate-fade-in animation-delay-200`}>
                {description}
            </p>

            {/* Action Button */}
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all btn-hover-lift animate-fade-in animation-delay-300"
                >
                    {action.icon && <action.icon size={18} />}
                    {action.label}
                </button>
            )}
        </div>
    );
};

/**
 * Preset Empty States for common scenarios
 */
export const EmptyStatePresets = {
    // No data found
    NoData: (props) => (
        <EmptyState
            icon={Icons.Package}
            title="Sin registros"
            description="Aún no hay información registrada en esta sección."
            {...props}
        />
    ),

    // Search no results
    NoSearchResults: (props) => (
        <EmptyState
            icon={Icons.Search}
            title="Sin resultados"
            description="No encontramos coincidencias con tu búsqueda. Intenta con otros términos."
            variant="search"
            {...props}
        />
    ),

    // No products
    NoProducts: (props) => (
        <EmptyState
            icon={Icons.Package}
            title="Sin productos"
            description="Comienza agregando tu primer producto al inventario."
            action={{ label: 'Agregar Producto', icon: Icons.Plus, onClick: props?.onAction }}
            {...props}
        />
    ),

    // No sales
    NoSales: (props) => (
        <EmptyState
            icon={Icons.ShoppingCart}
            title="Sin ventas registradas"
            description="Aún no hay ventas en este período. ¡Registra tu primera venta!"
            action={{ label: 'Nueva Venta', icon: Icons.Plus, onClick: props?.onAction }}
            {...props}
        />
    ),

    // No clients
    NoClients: (props) => (
        <EmptyState
            icon={Icons.Users}
            title="Sin clientes"
            description="Agrega clientes para poder registrar ventas y llevar un seguimiento."
            action={{ label: 'Agregar Cliente', icon: Icons.Plus, onClick: props?.onAction }}
            {...props}
        />
    ),

    // Error state
    Error: (props) => (
        <EmptyState
            icon={Icons.Alert}
            title="Algo salió mal"
            description={props?.message || "Ocurrió un error al cargar los datos. Por favor, intenta de nuevo."}
            variant="error"
            action={{ label: 'Reintentar', icon: Icons.RefreshCw, onClick: props?.onRetry }}
            {...props}
        />
    ),

    // Filters active but no results
    NoFilterResults: (props) => (
        <EmptyState
            icon={Icons.Filter}
            title="Sin coincidencias"
            description="Los filtros aplicados no arrojan resultados. Prueba ajustar los criterios."
            variant="search"
            action={{ label: 'Limpiar Filtros', onClick: props?.onClear }}
            {...props}
        />
    ),

    // Coming soon / Feature not available
    ComingSoon: (props) => (
        <EmptyState
            icon={Icons.Clock}
            title="Próximamente"
            description="Esta funcionalidad estará disponible en futuras actualizaciones."
            {...props}
        />
    )
};

export default EmptyState;
