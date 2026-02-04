import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center font-sans">
                    <div className="max-w-2xl bg-slate-800 p-8 rounded-2xl shadow-2xl border border-red-500/30">
                        <div className="text-red-500 mb-4 flex justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Algo salió mal</h1>
                        <p className="text-slate-400 mb-6">El sistema ha encontrado un error crítico y no puede continuar.</p>

                        <div className="bg-black/50 p-4 rounded-lg text-left overflow-auto max-h-64 font-mono text-xs text-red-300 mb-6 border border-white/10">
                            <p className="font-bold border-b border-white/10 pb-2 mb-2">{this.state.error && this.state.error.toString()}</p>
                            <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25"
                        >
                            Reiniciar Sistema
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
