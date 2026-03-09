import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 15; // 15 minutes

export const ROLES = {
    USER: "USER",
    MEMBER: "MEMBER",
    OFFICER: "OFFICER",
    ADMIN: "ADMIN",
    FOUNDER: "FOUNDER",
} as const;

export type UserRole = keyof typeof ROLES;

const ROLE_LEVEL: Record<string, number> = {
    USER: 0,
    MEMBER: 1,
    OFFICER: 2,
    ADMIN: 3,
    FOUNDER: 4,
};

export function hasRole(userRole: string, requiredRole: string): boolean {
    return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[requiredRole] ?? 99);
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export function generateSecureToken(size: number = 32): string {
    return crypto.randomBytes(size).toString("hex");
}

export async function invalidateUserSessions(userId: string) {
    await prisma.user.update({
        where: { id: userId },
        data: {
            authVersion: {
                increment: 1,
            },
        },
    });
}

export async function getCurrentUser() {
    const { getServerCurrentUser } = await import("@/lib/server-current-user");
    return getServerCurrentUser();
}
