"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface ConfirmModalProps {
    open: boolean;
    title?: string;
    message?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
    onClose?: () => void;
}

function ModalIcon({ danger }: { danger: boolean }) {
    if (danger) {
        return (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-error/15 text-error">
                <Trash2 className="h-5 w-5" />
            </div>
        );
    }

    return (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/20 text-warning">
            <AlertTriangle className="h-5 w-5" />
        </div>
    );
}

export function ConfirmModal({
    open,
    title,
    message,
    description,
    confirmLabel,
    cancelLabel,
    danger = true,
    onConfirm,
    onCancel,
    onClose,
}: ConfirmModalProps) {
    const { t } = useLocale();
    const resolvedTitle = title ?? t.dashboard.confirm.title;
    const resolvedMessage = message ?? description ?? "";
    const resolvedConfirmLabel = confirmLabel ?? t.dashboard.confirm.confirmLabel;
    const resolvedCancelLabel = cancelLabel ?? t.dashboard.confirm.cancelLabel;
    const handleCancel = onCancel ?? onClose ?? (() => {});
    if (!open) return null;

    return (
        <div className="modal modal-open z-[60] bg-neutral/50 backdrop-blur-sm">
            <div className="modal-box max-w-md p-0">
                <div className={`h-1 w-full ${danger ? "bg-error" : "bg-warning"}`} />
                <div className="space-y-5 p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                        <ModalIcon danger={danger} />
                        <div className="min-w-0">
                            <div className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${danger ? "text-error" : "text-warning"}`}>
                                {danger ? t.dashboard.confirm.sensitiveLabel : t.dashboard.confirm.neutralLabel}
                            </div>
                            <h3 className="mt-2 text-lg font-black tracking-tight text-base-content">{resolvedTitle}</h3>
                            <p className="mt-2 text-sm leading-6 text-base-content/60">{resolvedMessage}</p>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={handleCancel} className="btn btn-outline rounded-box">
                            {resolvedCancelLabel}
                        </button>
                        <button type="button" onClick={onConfirm} className={`btn rounded-box ${danger ? "btn-error" : "btn-warning"}`}>
                            {resolvedConfirmLabel}
                        </button>
                    </div>
                </div>
            </div>
            <button className="modal-backdrop" onClick={handleCancel} aria-label={t.dashboard.confirm.closeAria} />
        </div>
    );
}
