import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard shortcuts for the application
 * 
 * Shortcuts:
 * - Alt+1-9: Navigate to different sections
 * - Escape: Close modals, go back
 * - /: Focus search
 */
export const useKeyboardNavigation = () => {
    const navigate = useNavigate();

    const handleKeyDown = useCallback((event) => {
        // Ignore if user is typing in an input
        const target = event.target;
        const isTyping = target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

        // Allow Escape even when typing
        if (event.key === 'Escape') {
            // Blur the current element and close modals
            target.blur();
            return;
        }

        // Skip other shortcuts if user is typing
        if (isTyping) return;

        // Alt + Number navigation shortcuts
        if (event.altKey && !event.ctrlKey && !event.metaKey) {
            const shortcuts = {
                '1': '/',           // Dashboard
                '2': '/sales',      // Ventas
                '3': '/purchases',  // Compras
                '4': '/inventory',  // Inventario
                '5': '/expenses',   // Gastos
                '6': '/reports',    // Reportes
                '7': '/analytics',  // Analytics
                '8': '/clients',    // Clientes
                '9': '/suppliers',  // Proveedores
            };

            if (shortcuts[event.key]) {
                event.preventDefault();
                navigate(shortcuts[event.key]);
            }
        }

        // / to focus search (Ctrl+K is already handled by CommandPalette)
        if (event.key === '/' && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            // Trigger Ctrl+K programmatically
            const ctrlKEvent = new KeyboardEvent('keydown', {
                key: 'k',
                ctrlKey: true,
                bubbles: true
            });
            document.dispatchEvent(ctrlKEvent);
        }

    }, [navigate]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

/**
 * Hook to trap focus within a modal/dialog
 */
export const useFocusTrap = (containerRef, isActive = true) => {
    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Focus the first element when modal opens
        firstElement?.focus();

        const handleTabKey = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        container.addEventListener('keydown', handleTabKey);
        return () => container.removeEventListener('keydown', handleTabKey);
    }, [containerRef, isActive]);
};

/**
 * Hook to return focus to trigger element when modal closes
 */
export const useRestoreFocus = (isOpen) => {
    useEffect(() => {
        const previouslyFocused = document.activeElement;

        return () => {
            if (!isOpen && previouslyFocused instanceof HTMLElement) {
                previouslyFocused.focus();
            }
        };
    }, [isOpen]);
};

/**
 * Skip to main content link (accessibility)
 */
export const SkipToMainContent = () => (
    <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg transition-all"
    >
        Saltar al contenido principal
    </a>
);

export default useKeyboardNavigation;
