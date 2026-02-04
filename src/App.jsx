import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { MainLayout } from './layouts/MainLayout';
import { Notification } from './components/shared/Notification';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Sales } from './pages/Sales';
import { Purchases } from './pages/Purchases';
import { Inventory } from './pages/Inventory';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { Clients } from './pages/Clients';
import { Suppliers } from './pages/Suppliers';
import { Analytics } from './pages/Analytics';
import { InvoiceUpload } from './pages/InvoiceUpload';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="loader mr-2"></div> Cargando...</div>;
    if (!user) return <Navigate to="/login" />;
    return children;
};

// Global Notification Wrapper
const AppContent = () => {
    const { notification, setNotification } = useData(); // Safe to use here because it's inside DataProvider
    return (
        <>
            {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                    <Route index element={<Dashboard />} />
                    <Route path="sales" element={<Sales />} />
                    <Route path="purchases" element={<Purchases />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="expenses" element={<Expenses />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="clients" element={<Clients />} />
                    <Route path="suppliers" element={<Suppliers />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="invoice-upload" element={<InvoiceUpload />} />
                </Route>
            </Routes>
        </>
    );
};

// Outer Wrapper
function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <DataProvider>
                    <AppContent />
                </DataProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
