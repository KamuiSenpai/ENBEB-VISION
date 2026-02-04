import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/ui/Icons';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
    const { login, register, user } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isRegistering) {
                await register(email, password);
            } else {
                await login(email, password);
            }
        } catch (err) {
            console.error("Login error details:", err);
            setError("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute top-1/2 -right-32 w-64 h-64 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl mx-auto flex items-center justify-center shadow-lg mb-4 transform rotate-3">
                        <Icons.TrendingUp className="text-white" size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">ENBEB VISION</h2>
                    <p className="text-indigo-200 text-sm mt-2">Sistema Integral de Gestión & Analytics</p>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm flex items-center"><Icons.X size={16} className="mr-2" />{error}</div>}

                <form onSubmit={handleAuth} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">Email Corporativo</label>
                        <div className="relative">
                            <Icons.Users className="absolute left-3 top-3 text-indigo-300" size={18} />
                            <input
                                type="email"
                                required
                                className="w-full bg-slate-800/50 border border-indigo-500/30 rounded-lg py-2.5 pl-10 px-4 text-white placeholder-indigo-400/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="usuario@empresa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">Contraseña</label>
                        <div className="relative">
                            <Icons.LogOut className="absolute left-3 top-3 text-indigo-300" size={18} />
                            <input
                                type="password"
                                required
                                className="w-full bg-slate-800/50 border border-indigo-500/30 rounded-lg py-2.5 pl-10 px-4 text-white placeholder-indigo-400/50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading ? <div className="loader border-white/30 border-t-white h-5 w-5 mr-2"></div> : null}
                        {isRegistering ? 'Crear Cuenta Empresarial' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-xs text-indigo-300 hover:text-white transition-colors underline decoration-dotted underline-offset-4"
                    >
                        {isRegistering ? '¿Ya tienes cuenta? Iniciar Sesión' : '¿No tienes cuenta? Registrarse'}
                    </button>
                </div>
            </div>

            <p className="fixed bottom-4 text-slate-500 text-xs text-center w-full z-0">© 2026 ENBEB Systems v4.0. Secured by Firebase.</p>
        </div>
    );
};
