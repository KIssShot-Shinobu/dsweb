import type { Metadata } from "next";
import { AuthPageLayout } from "@/components/auth/auth-page-layout";

export const metadata: Metadata = {
    title: "Duel Standby | Akses Akun",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <AuthPageLayout>{children}</AuthPageLayout>;
}
