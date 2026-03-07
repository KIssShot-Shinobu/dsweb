import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function requireDashboardUser() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login?redirect=/dashboard");
    }

    if (user.status !== "ACTIVE" && !["ADMIN", "FOUNDER"].includes(user.role)) {
        const errorParam = user.status === "BANNED" ? "?error=banned" : "";
        redirect(`/login${errorParam}`);
    }

    return user;
}

export async function requireDashboardRole(requiredRole: string) {
    const user = await requireDashboardUser();

    if (!hasRole(user.role, requiredRole)) {
        redirect("/dashboard/profile");
    }

    return user;
}
