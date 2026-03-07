"use client";

import { useDashboardUserContext } from "@/context/dashboard-user-context";

export interface CurrentUser {
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
    avatarUrl?: string | null;
    city?: string | null;
    phoneWhatsapp?: string | null;
    createdAt?: string;
    lastActiveAt?: string;
    emailVerified?: boolean;
}

export function useCurrentUser() {
    return useDashboardUserContext();
}
