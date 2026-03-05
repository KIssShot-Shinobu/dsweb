"use client";

interface ConfirmModalProps {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    open,
    title = "Are you sure?",
    message,
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    danger = true,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ animation: "confirmFadeIn 0.12s ease-out" }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

            {/* Panel */}
            <div
                className="relative w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden"
                style={{ animation: "confirmSlideUp 0.18s cubic-bezier(0.34,1.56,0.64,1)" }}
            >
                {/* Icon strip */}
                <div className={`h-1 w-full ${danger ? "bg-red-500" : "bg-ds-amber"}`} />

                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 ${danger ? "bg-red-500/10" : "bg-ds-amber/10"}`}>
                        {danger ? "🗑️" : "⚠️"}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{title}</h3>

                    {/* Message */}
                    <p className="text-sm text-gray-500 dark:text-white/50 mb-6 leading-relaxed">{message}</p>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${danger ? "bg-red-500 hover:bg-red-600" : "bg-ds-amber hover:bg-ds-gold text-black"}`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes confirmFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes confirmSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.95); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
