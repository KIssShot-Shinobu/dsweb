import type { Metadata } from "next";

export const metadata: Metadata = {
    alternates: {
        canonical: "/tournaments",
    },
};

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
