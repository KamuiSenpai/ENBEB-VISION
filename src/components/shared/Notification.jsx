import React, { useEffect, useState } from 'react';
import { Icons } from '../ui/Icons';
import { cn } from '../../lib/utils';

export const Notification = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={cn(
            "fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 transform transition-all duration-300 animate-slide-in border-l-4 min-w-[320px]",
            type === 'success' ? "bg-white border-green-500 text-gray-800" : "bg-white border-red-500 text-gray-800"
        )}>
            <div className={cn(
                "p-2 rounded-full",
                type === 'success' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            )}>
                {type === 'success' ? <Icons.Package size={20} /> : <Icons.X size={20} />}
            </div>
            <div className="flex-1">
                <p className="font-bold text-sm tracking-wide uppercase text-gray-400 mb-0.5">{type === 'success' ? 'Éxito' : 'Error'}</p>
                <p className="font-semibold text-sm">{message}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <Icons.X size={18} />
            </button>
        </div>
    );
};
