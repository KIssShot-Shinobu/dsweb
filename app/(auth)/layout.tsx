import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Duel Standby Guild",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(245,185,66,0.16),_transparent_22%),radial-gradient(circle_at_bottom_left,_rgba(245,185,66,0.10),_transparent_25%),linear-gradient(180deg,_#09090b_0%,_#111114_100%)] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-ds-amber/10 blur-3xl" />
                <div className="absolute bottom-[-12rem] left-[-10rem] h-[30rem] w-[30rem] rounded-full bg-white/[0.03] blur-3xl" />
            </div>
            <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">{children}</div>
        </div>
    );
}
