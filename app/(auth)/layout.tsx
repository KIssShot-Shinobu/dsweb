import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Duel Standby Guild",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            {/* Background pattern */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-ds-amber/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-ds-amber/5 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10 w-full">
                {children}
            </div>
        </div>
    );
}
