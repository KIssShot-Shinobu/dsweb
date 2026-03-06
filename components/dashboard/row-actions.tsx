"use client";

import { ReactNode } from "react";
import { btnDanger, btnOutline } from "@/components/dashboard/form-styles";

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
    editLabel = "Edit",
    deleteLabel = "Hapus",
    extra,
    className = "",
}: RowActionsProps) {
    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            <button onClick={onEdit} className={btnOutline}>
                {editLabel}
            </button>
            <button onClick={onDelete} className={btnDanger}>
                {deleteLabel}
            </button>
            {extra}
        </div>
    );
}

