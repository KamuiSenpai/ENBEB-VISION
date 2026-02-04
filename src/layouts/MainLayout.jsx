import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/ui/Icons';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { CommandPalette, useCommandPalette } from '../components/ui/CommandPalette';
import { useKeyboardNavigation, SkipToMainContent } from '../hooks/useKeyboardNavigation.jsx';

/**
 * Tooltip component for collapsed sidebar
 */
const Tooltip = ({ children, label, show }) => {
    if (!show) return children;
    return (
        <div className="relative group">
            {children}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                {label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></div>
            </div>
        </div>
    );
};

const NavItem = ({ to, icon: Icon, label, isCollapsed, setIsSidebarOpen }) => (
    <Tooltip label={label} show={isCollapsed}>
        <NavLink
            to={to}
            onClick={() => setIsSidebarOpen && setIsSidebarOpen(false)}
            className={({ isActive }) => `
                relative group w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3.5 rounded-xl transition-all duration-300
                ${isActive
                    ? 'bg-white/10 text-white shadow-lg shadow-indigo-500/20 backdrop-blur-sm border border-white/10'
                    : 'text-slate-400 hover:bg-white/5 hover:text-indigo-200'}
            `}
        >
            {({ isActive }) => (
                <>
                    <div className={`absolute left-0 w-1 h-8 rounded-r-full bg-indigo-500 transition-all duration-300 ${isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></div>
                    <Icon size={20} className={`transition-transform duration-300 flex-shrink-0 ${isActive ? 'scale-110 text-indigo-400' : 'group-hover:scale-110'}`} />
                    {!isCollapsed && <span className="font-medium text-sm tracking-wide">{label}</span>}
                    {isActive && !isCollapsed && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>}
                </>
            )}
        </NavLink>
    </Tooltip>
);

const SectionLabel = ({ children, isCollapsed }) => {
    if (isCollapsed) return <div className="my-4 border-t border-white/10"></div>;
    return <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{children}</div>;
};

export const MainLayout = () => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar-collapsed') === 'true';
    });
    const location = useLocation();
    const commandPalette = useCommandPalette();

    // Enable global keyboard navigation
    useKeyboardNavigation();

    // Persist collapsed state
    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', isCollapsed);
    }, [isCollapsed]);

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Panel de Control';
        if (path === '/sales') return 'Terminal de Ventas';
        if (path === '/purchases') return 'Gestión de Compras';
        if (path === '/inventory') return 'Inventario & Stock';
        if (path === '/expenses') return 'Gastos Operativos';
        if (path === '/reports') return 'Reportes Inteligentes';
        if (path === '/analytics') return 'Inteligencia de Negocios';
        if (path === '/clients') return 'Cartera de Clientes';
        if (path === '/suppliers') return 'Proveedores';
        if (path === '/invoice-upload') return 'Escanear Facturas';
        return 'Enbeb Vision';
    };

    return (
        <>
            <SkipToMainContent />
            <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans selection:bg-indigo-500/30">
                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                )}

                {/* Sidebar */}
                <aside className={`
                fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0
                ${isCollapsed ? 'w-20' : 'w-72'}
                h-full bg-slate-900
                flex flex-col shadow-2xl transition-all duration-300 ease-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                        <div className="absolute -top-[20%] -left-[20%] w-[70%] h-[40%] bg-indigo-600/20 blur-[100px] rounded-full"></div>
                        <div className="absolute top-[40%] -right-[20%] w-[60%] h-[40%] bg-cyan-600/10 blur-[80px] rounded-full"></div>
                    </div>

                    {/* Sidebar Header */}
                    <div className="relative z-10 p-4 flex justify-between items-center">
                        <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
                            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
                                <Icons.TrendingUp className="text-white" size={24} />
                            </div>
                            {!isCollapsed && (
                                <div>
                                    <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">
                                        ENBEB<span className="text-indigo-400">.</span>
                                    </h1>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Vision ERP v4.0</p>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors">
                            <Icons.X size={24} />
                        </button>
                    </div>

                    {/* Collapse Toggle Button - Desktop only */}
                    <div className="hidden md:flex px-4 pb-0">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={`w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all`}
                        >
                            {isCollapsed ? (
                                <Icons.ArrowUp size={16} className="rotate-90" />
                            ) : (
                                <>
                                    <Icons.ArrowUp size={16} className="-rotate-90" />
                                    <span>Colapsar</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="relative z-10 flex-1 px-3 py-2 space-y-1.5 overflow-y-auto hide-scrollbar">
                        <SectionLabel isCollapsed={isCollapsed}>Principal</SectionLabel>
                        <NavItem to="/" icon={Icons.Dashboard} label="Dashboard" isCollapsed={isCollapsed} setIsSidebarOpen={setIsSidebarOpen} />
                        <NavItem to="/sales" icon={Icons.Cart} label="Ventas & POS" isCollapsed={isCollapsed} setIsSidebarOpen={setIsSidebarOpen} />
                        <NavItem to="/purchases" icon={Icons.ShoppingBag} label="Compras" isCollapsed={isCollapsed} setIsSidebarOpen={setIsSidebarOpen} />
                        <NavItem to="/invoice-upload" icon={Icons.Camera} label="Escanear Facturas" isCollapsed={isCollapsed} setIsSidebarOpen={setIsSidebarOpen} />

                        <SectionLabel isCollapsed={isCollapsed}>Gestión</SectionLabel>
                        <NavItem to="/inventory" icon={Icons.Package} label="Inventario" isCollapsed={isCollapsed} setIsSidebarOpen={setIsSidebarOpen} />
                        <NavItem to="/expenses" icon={Icons.Wallet} label="Gastos (OpEx)" isCollapsed={isCollapsed} setIsSidebarOpen={setIsSidebarOpen} />

                        <SectionLabel isCollapsed={isCollapsed}>Directorios</SectionLabel>
                        <NavItem to="/clients" icon={Icons.Users} label="Clientes" isCollapsed={isCollapsed} setIsSidebarOpen={setIsSidebarOpen} />
                        <NavItem to="/suppliers" icon={Icons.Truck} label="Proveedores" isCollapsed={isCollapsed} setIsSidebarOpen={setIsSidebarOpen} />

                        <SectionLabel isCollapsed={isCollapsed}>Inteligencia</SectionLabel>
                        <NavItem to="/reports" icon={Icons.FileText} label="Reportes" isCollapsed={isCollapsed} setIsSidebarOpen={setIsSidebarOpen} />
                        <NavItem to="/analytics" icon={Icons.Activity} label="BI & Analytics" isCollapsed={isCollapsed} setIsSidebarOpen={setIsSidebarOpen} />
                    </nav>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#F8FAFC]">
                    {/* Header */}
                    <header className="h-16 px-6 flex items-center justify-between bg-white border-b border-slate-200">
                        {/* Left Side - Menu + Title + Breadcrumbs */}
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <Icons.Menu size={24} />
                            </button>
                            <div className="hidden sm:block">
                                <Breadcrumbs />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 sm:hidden">{getPageTitle()}</h2>
                        </div>

                        {/* Center - Search Button */}
                        <button
                            onClick={commandPalette.open}
                            className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 text-sm transition-colors group"
                        >
                            <Icons.Search size={16} />
                            <span>Buscar...</span>
                            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white rounded border border-slate-200 text-slate-400 group-hover:border-slate-300">
                                Ctrl K
                            </kbd>
                        </button>

                        {/* Right Side - User Actions */}
                        <div className="flex items-center gap-2">
                            {/* User Profile Card */}
                            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-sm">
                                    {user?.email?.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-sm font-semibold text-slate-700 leading-tight max-w-[140px] truncate">{user?.email?.split('@')[0]}</p>
                                    <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                        Conectado
                                    </p>
                                </div>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all"
                                title="Cerrar Sesión"
                            >
                                <Icons.LogOut size={18} />
                                <span className="hidden md:inline text-sm font-medium">Salir</span>
                            </button>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 scroll-smooth relative custom-scrollbar">
                        <div className="max-w-7xl mx-auto animate-fade-in pb-12">
                            <Outlet />
                        </div>
                    </main>
                </div>

                {/* Command Palette Modal */}
                <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
            </div>
        </>
    );
};
