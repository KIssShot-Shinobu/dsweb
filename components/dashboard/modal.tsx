"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
}

const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    if (!open) return null;

    return (
        <div className="modal modal-open z-50 bg-neutral/50 backdrop-blur-sm">
            <div className={cn("modal-box max-h-[90vh] p-0", sizeClass[size])}>
                <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
                    <h2 className="text-base font-semibold text-base-content">{title}</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" aria-label="Close modal">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="overflow-y-auto p-5">{children}</div>
            </div>
            <button className="modal-backdrop" onClick={onClose} aria-label="Close modal" />
        </div>
    );
}
