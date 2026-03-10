import type { ReactNode } from "react";

export function AuthPageLayout({ children }: { children: ReactNode }) {
    return (
        <div className="ds-surface min-h-screen px-4 py-5 sm:px-6 sm:py-8">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="ds-grid-bg absolute inset-0 opacity-30" />
            </div>
            <div className="relative z-10 flex min-h-[calc(100vh-2.5rem)] items-center justify-center">{children}</div>
        </div>
    );
}
