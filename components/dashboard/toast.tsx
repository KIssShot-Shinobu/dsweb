"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useLocale } from "@/hooks/use-locale";

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

const ToastContext = createContext<ToastContextValue>({
    toast: () => {},
    success: () => {},
    error: () => {},
    warning: () => {},
    info: () => {},
});

export const useToast = () => useContext(ToastContext);

const styles: Record<ToastType, { alert: string }> = {
    success: { alert: "alert-success" },
    error: { alert: "alert-error" },
    warning: { alert: "alert-warning" },
    info: { alert: "alert-info" },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const { t } = useLocale();
    const s = styles[toast.type];
    const titles: Record<ToastType, string> = {
        success: t.dashboard.toast.success,
        error: t.dashboard.toast.error,
        warning: t.dashboard.toast.warning,
        info: t.dashboard.toast.info,
    };

    return (
        <div className={`alert ${s.alert} w-80 max-w-[calc(100vw-2rem)] rounded-box shadow-xl`}>
            <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{toast.title ?? titles[toast.type]}</div>
                <div className="mt-0.5 break-words text-xs">{toast.message}</div>
            </div>
            <button onClick={() => onRemove(toast.id)} className="btn btn-ghost btn-xs btn-circle" aria-label={t.dashboard.toast.dismiss}>
                x
            </button>
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const remove = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const add = useCallback((message: string, type: ToastType = "info", title?: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setToasts((prev) => [...prev.slice(-4), { id, type, message, title }]);
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
            <div className="toast toast-end toast-bottom z-[9999]">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={remove} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
