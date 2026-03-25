"use client";

import { useLocale } from "@/hooks/use-locale";

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    perPage: number;
    onPage: (page: number) => void;
}

export function Pagination({ page, totalPages, total, perPage, onPage }: PaginationProps) {
    const { t } = useLocale();
    if (totalPages <= 1) return null;

    const from = (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);

    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i += 1) pages.push(i);
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }

    return (
        <div className="mt-4 flex items-center justify-between border-t border-base-300 pt-4">
            <span className="text-xs text-base-content/50">
                {t.dashboard.pagination.showing(from, to, total)}
            </span>
            <div className="join">
                <button className="join-item btn btn-sm btn-ghost" onClick={() => onPage(page - 1)} disabled={page === 1} title={t.dashboard.pagination.previous}>
                    {"<"}
                </button>
                {pages.map((entry, index) =>
                    entry === "..." ? (
                        <span key={`ellipsis-${index}`} className="join-item btn btn-sm btn-disabled">
                            ...
                        </span>
                    ) : (
                        <button
                            key={entry}
                            className={`join-item btn btn-sm ${entry === page ? "btn-primary" : "btn-ghost"}`}
                            onClick={() => onPage(entry)}
                        >
                            {entry}
                        </button>
                    ),
                )}
                <button className="join-item btn btn-sm btn-ghost" onClick={() => onPage(page + 1)} disabled={page === totalPages} title={t.dashboard.pagination.next}>
                    {">"}
                </button>
            </div>
        </div>
    );
}
