interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    perPage: number;
    onPage: (page: number) => void;
}

export function Pagination({ page, totalPages, total, perPage, onPage }: PaginationProps) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);

    // Generate page numbers with ellipsis
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }

    const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all";
    const btnInactive = `${btnBase} text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white`;
    const btnActive = `${btnBase} bg-ds-amber text-black`;
    const btnDisabled = `${btnBase} text-gray-300 dark:text-white/10 cursor-not-allowed`;

    return (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <span className="text-xs text-gray-400 dark:text-white/30">
                Showing {from}–{to} of {total}
            </span>
            <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                    className={page === 1 ? btnDisabled : btnInactive}
                    onClick={() => onPage(page - 1)}
                    disabled={page === 1}
                    title="Previous"
                >
                    ‹
                </button>

                {pages.map((p, i) =>
                    p === "..." ? (
                        <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-gray-400 dark:text-white/30">…</span>
                    ) : (
                        <button
                            key={p}
                            className={p === page ? btnActive : btnInactive}
                            onClick={() => onPage(p as number)}
                        >
                            {p}
                        </button>
                    )
                )}

                {/* Next */}
                <button
                    className={page === totalPages ? btnDisabled : btnInactive}
                    onClick={() => onPage(page + 1)}
                    disabled={page === totalPages}
                    title="Next"
                >
                    ›
                </button>
            </div>
        </div>
    );
}
