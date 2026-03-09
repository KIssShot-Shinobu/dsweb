import type { ReactNode } from "react";

export function AuthPageLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#0b0d12_0%,#171923_48%,#0d1017_100%)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(133,188,222,0.18),transparent_22%),radial-gradient(circle_at_76%_14%,rgba(255,180,180,0.1),transparent_20%),radial-gradient(circle_at_45%_62%,rgba(255,255,255,0.05),transparent_24%)]" />
                <div className="absolute inset-x-0 top-0 h-[48vh] bg-[linear-gradient(180deg,rgba(93,140,177,0.34)_0%,rgba(54,80,110,0.18)_40%,transparent_100%)]" />
                <div className="absolute inset-x-0 bottom-0 h-[38vh] bg-[linear-gradient(180deg,transparent_0%,rgba(41,28,21,0.18)_35%,rgba(24,17,14,0.5)_100%)]" />
                <div className="absolute bottom-[-6rem] left-[-4rem] h-[18rem] w-[24rem] rounded-[50%] bg-[rgba(70,44,30,0.42)] blur-3xl" />
                <div className="absolute bottom-[-3rem] right-[8%] h-[14rem] w-[20rem] rounded-[45%] bg-[rgba(60,38,26,0.3)] blur-3xl" />
            </div>
            <div className="relative z-10 flex min-h-[calc(100vh-3rem)] items-center justify-center">{children}</div>
        </div>
    );
}
