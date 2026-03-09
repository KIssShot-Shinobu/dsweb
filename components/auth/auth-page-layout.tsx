import type { ReactNode } from "react";

export function AuthPageLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#0c1018_0%,#151a22_100%)] px-4 py-5 sm:px-6 sm:py-8">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(122,164,198,0.14),transparent_24%),radial-gradient(circle_at_bottom,rgba(82,58,44,0.16),transparent_26%)]" />
            </div>
            <div className="relative z-10 flex min-h-[calc(100vh-2.5rem)] items-center justify-center">{children}</div>
        </div>
    );
}
