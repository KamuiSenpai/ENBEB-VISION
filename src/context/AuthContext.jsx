import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = (email, password) => {
        console.log("AuthContext: login called for", email);
        return signInWithEmailAndPassword(auth, email, password);
    };
    const register = (email, password) => createUserWithEmailAndPassword(auth, email, password);
    const logout = () => firebaseSignOut(auth);

    const value = {
        user,
        loading,
        login,
        register,
        logout
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="loader mr-3"></div><span className="text-gray-600 font-medium">Iniciando sistema...</span></div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
