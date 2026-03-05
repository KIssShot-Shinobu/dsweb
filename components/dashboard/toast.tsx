"use client";

import { createContext, useCallback, useContext, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    title?: string;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType, title?: string) => void;
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({
    toast: () => { },
    success: () => { },
    error: () => { },
    warning: () => { },
    info: () => { },
});

export const useToast = () => useContext(ToastContext);

// ─── Styles per type ──────────────────────────────────────────────────────────
const styles: Record<ToastType, { bar: string; icon: string; title: string }> = {
    success: { bar: "bg-emerald-500", icon: "✓", title: "Success" },
    error: { bar: "bg-red-500", icon: "✕", title: "Error" },
    warning: { bar: "bg-ds-amber", icon: "⚠", title: "Warning" },
    info: { bar: "bg-blue-500", icon: "ℹ", title: "Info" },
};

// ─── Individual Toast item ────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const s = styles[toast.type];
    return (
        <div
            className="flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden"
            style={{ animation: "toastIn 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
            {/* Colored left bar */}
            <div className={`w-1 self-stretch ${s.bar} flex-shrink-0`} />

            {/* Icon */}
            <div className={`w-7 h-7 rounded-lg ${s.bar} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-3`}>
                {s.icon}
            </div>

            {/* Content */}
            <div className="flex-1 py-3 pr-2 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {toast.title ?? s.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-white/50 mt-0.5 break-words">
                    {toast.message}
                </div>
            </div>

            {/* Close button */}
            <button
                onClick={() => onRemove(toast.id)}
                className="mt-2.5 mr-2.5 w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-xs"
            >
                ✕
            </button>
        </div>
    );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const remove = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const add = useCallback((message: string, type: ToastType = "info", title?: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setToasts((prev) => [...prev.slice(-4), { id, type, message, title }]); // max 5 at once
        setTimeout(() => remove(id), 4000);
    }, [remove]);

    const value: ToastContextValue = {
        toast: add,
        success: (msg, title) => add(msg, "success", title),
        error: (msg, title) => add(msg, "error", title),
        warning: (msg, title) => add(msg, "warning", title),
        info: (msg, title) => add(msg, "info", title),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}

            {/* Toast container — bottom-right */}
            <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
                {toasts.map((t) => (
                    <div key={t.id} className="pointer-events-auto">
                        <ToastItem toast={t} onRemove={remove} />
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes toastIn {
                    from { opacity: 0; transform: translateX(24px) scale(0.94); }
                    to   { opacity: 1; transform: translateX(0)    scale(1); }
                }
            `}</style>
        </ToastContext.Provider>
    );
}
