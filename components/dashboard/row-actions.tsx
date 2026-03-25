"use client";

import type { ReactNode } from "react";
import { btnDanger, btnOutline } from "@/components/dashboard/form-styles";
import { useLocale } from "@/hooks/use-locale";

type RowActionsProps = {
    onEdit: () => void;
    onDelete: () => void;
    editLabel?: string;
    deleteLabel?: string;
    extra?: ReactNode;
    className?: string;
};

export function RowActions({
    onEdit,
    onDelete,
    editLabel,
    deleteLabel,
    extra,
    className = "",
}: RowActionsProps) {
    const { t } = useLocale();
    const resolvedEditLabel = editLabel ?? t.common.edit;
    const resolvedDeleteLabel = deleteLabel ?? t.common.delete;
    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            <button onClick={onEdit} className={`${btnOutline} btn-sm`}>
                {resolvedEditLabel}
            </button>
            <button onClick={onDelete} className={`${btnDanger} btn-sm`}>
                {resolvedDeleteLabel}
            </button>
            {extra}
        </div>
    );
}
