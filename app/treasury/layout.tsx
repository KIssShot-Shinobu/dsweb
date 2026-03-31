import type { Metadata } from "next";

export const metadata: Metadata = {
    alternates: {
        canonical: "/treasury",
    },
};

export default function TreasuryLayout({ children }: { children: React.ReactNode }) {
    return children;
}
