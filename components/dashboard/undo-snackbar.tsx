"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/hooks/use-locale";

interface UndoSnackbarProps {
    open: boolean;
    message: string;
    duration?: number;
    onUndo: () => void;
}

export function UndoSnackbar({ open, message, duration = 5000, onUndo }: UndoSnackbarProps) {
    const { t } = useLocale();
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open && barRef.current) {
            barRef.current.style.animation = "none";
            void barRef.current.offsetWidth;
            barRef.current.style.animation = `undoCountdown ${duration}ms linear forwards`;
        }
    }, [open, duration]);

    if (!open) return null;

    return (
        <div className="toast toast-center toast-bottom z-[9998]">
            <div className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-box border border-base-300 bg-neutral text-neutral-content shadow-2xl">
                <div className="h-0.5 w-full bg-neutral-content/10">
                    <div ref={barRef} className="h-full origin-left bg-primary" style={{ animation: `undoCountdown ${duration}ms linear forwards` }} />
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-error/20 text-sm text-error-content">
                        !
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-content">{message}</p>
                        <p className="mt-0.5 text-xs text-neutral-content/50">
                            {t.dashboard.undo.deletingCountdown(Math.max(1, Math.ceil(duration / 1000)))}
                        </p>
                    </div>
                    <button onClick={onUndo} className="btn btn-primary btn-sm rounded-box">
                        {t.dashboard.undo.undo}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes undoCountdown {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
            `}</style>
        </div>
    );
}
