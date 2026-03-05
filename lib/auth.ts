import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// ─── Config ───────────────────────────────────────────────────────────────────
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "duel-standby-secret-key-change-in-production"
);
const COOKIE_NAME = "ds_auth";
const TOKEN_EXPIRY = "8h";

// ─── Role Hierarchy ──────────────────────────────────────────────────────────
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

// ─── Password ─────────────────────────────────────────────────────────────────
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// ─── JWT ──────────────────────────────────────────────────────────────────────
export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    status: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
    return await new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(TOKEN_EXPIRY)
        .setIssuedAt()
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────
export async function setAuthCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 8, // 8 hours
        path: "/",
    });
}

export async function clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

export async function getTokenFromCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

// ─── Get current user ─────────────────────────────────────────────────────────
export async function getCurrentUser() {
    const token = await getTokenFromCookie();
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            avatarUrl: true,
            city: true,
            phoneWhatsapp: true,
            createdAt: true,
        },
    });

    return user;
}

// ─── Get current user from token string (for middleware/API) ──────────────────
export async function getUserFromToken(token: string) {
    const payload = await verifyToken(token);
    if (!payload) return null;
    return payload;
}
