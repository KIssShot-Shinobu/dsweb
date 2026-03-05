"use client";

import { useEffect, useRef } from "react";

interface UndoSnackbarProps {
    open: boolean;
    message: string;
    duration?: number; // ms, default 5000
    onUndo: () => void;
}

export function UndoSnackbar({ open, message, duration = 5000, onUndo }: UndoSnackbarProps) {
    const barRef = useRef<HTMLDivElement>(null);

    // Restart the CSS animation every time it opens
    useEffect(() => {
        if (open && barRef.current) {
            barRef.current.style.animation = "none";
            // Force reflow to restart animation
            void barRef.current.offsetWidth;
            barRef.current.style.animation = `undoCountdown ${duration}ms linear forwards`;
        }
    }, [open, duration]);

    if (!open) return null;

    return (
        <div
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9998] w-[calc(100vw-2rem)] max-w-sm"
            style={{ animation: "snackbarSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
            <div className="bg-gray-900 dark:bg-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden border border-white/10">
                {/* Countdown bar */}
                <div className="w-full h-0.5 bg-white/10">
                    <div
                        ref={barRef}
                        className="h-full bg-ds-amber origin-left"
                        style={{ animation: `undoCountdown ${duration}ms linear forwards` }}
                    />
                </div>

                {/* Content */}
                <div className="flex items-center gap-3 px-4 py-3">
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center text-sm flex-shrink-0">
                        🗑️
                    </div>

                    {/* Message */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{message}</p>
                        <p className="text-xs text-white/40 mt-0.5">Deleting in 5 seconds…</p>
                    </div>

                    {/* Undo button */}
                    <button
                        onClick={onUndo}
                        className="flex-shrink-0 px-4 py-1.5 rounded-xl bg-ds-amber hover:bg-ds-gold text-black text-xs font-bold transition-all active:scale-95"
                    >
                        Undo
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes undoCountdown {
                    from { transform: scaleX(1); }
                    to   { transform: scaleX(0); }
                }
                @keyframes snackbarSlideUp {
                    from { opacity: 0; transform: translate(-50%, 16px); }
                    to   { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>
        </div>
    );
}
