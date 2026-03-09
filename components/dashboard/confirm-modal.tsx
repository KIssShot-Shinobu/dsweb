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

function ModalIcon({ danger }: { danger: boolean }) {
    if (danger) {
        return (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                </svg>
            </div>
        );
    }

    return (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ds-amber/12 text-ds-amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
        </div>
    );
}

export function ConfirmModal({
    open,
    title = "Konfirmasi Aksi",
    message,
    confirmLabel = "Lanjutkan",
    cancelLabel = "Batal",
    danger = true,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ animation: "confirmFadeIn 0.14s ease-out" }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

            <div
                className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[#14181f]"
                style={{ animation: "confirmSlideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
            >
                <div className={`h-1 w-full ${danger ? "bg-red-500" : "bg-ds-amber"}`} />

                <div className="space-y-5 p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                        <ModalIcon danger={danger} />
                        <div className="min-w-0">
                            <div className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${danger ? "text-red-500/80" : "text-ds-amber/90"}`}>
                                {danger ? "Aksi Sensitif" : "Konfirmasi"}
                            </div>
                            <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950 dark:text-white">{title}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/50">{message}</p>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70 dark:hover:bg-white/[0.06]"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
                                danger
                                    ? "bg-red-500 text-white hover:bg-red-600"
                                    : "bg-ds-amber text-black hover:bg-ds-gold"
                            }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes confirmFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes confirmSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
