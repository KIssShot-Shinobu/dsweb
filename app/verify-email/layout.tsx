import type { ReactNode } from "react";
import { AuthPageLayout } from "@/components/auth/auth-page-layout";

export default function VerifyEmailLayout({ children }: { children: ReactNode }) {
    return <AuthPageLayout>{children}</AuthPageLayout>;
}
