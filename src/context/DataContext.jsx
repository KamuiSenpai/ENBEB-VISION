import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [clients, setClients] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [notification, setNotification] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
    };

    useEffect(() => {
        if (!user) {
            setProducts([]);
            setSales([]);
            setPurchases([]);
            setClients([]);
            setSuppliers([]);
            setExpenses([]);
            return;
        }

        const safeSnapshot = (q, setter, name) => onSnapshot(q,
            (s) => setter(s.docs.map(d => ({ id: d.id, ...d.data() }))),
            (e) => { console.error(`Error fetching ${name}:`, e); }
        );

        const unsubProds = safeSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'products'), setProducts, 'products');
        const unsubSales = safeSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'sales'), setSales, 'sales');
        const unsubPurchases = safeSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'purchases'), setPurchases, 'purchases');
        const unsubClients = safeSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'clients'), setClients, 'clients');
        const unsubSuppliers = safeSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'suppliers'), setSuppliers, 'suppliers');
        const unsubExpenses = safeSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), setExpenses, 'expenses');

        return () => {
            unsubProds(); unsubSales(); unsubPurchases(); unsubClients(); unsubSuppliers(); unsubExpenses();
        }
    }, [user]);

    // Sorting logic can be done here or in components. 
    // Doing it here ensures consistency.
    const sortedSales = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date));
    const sortedPurchases = [...purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Provide context value
    const value = {
        products,
        sales: sortedSales,
        purchases: sortedPurchases,
        clients,
        suppliers,
        expenses: sortedExpenses,
        notification,
        setNotification,
        showNotification,
        isLoading
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
