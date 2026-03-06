import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ─── Config ───────────────────────────────────────────────────────────────────
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "duel-standby-secret-key-change-in-production"
);
const ACCESS_COOKIE_NAME = "ds_auth";
const REFRESH_COOKIE_NAME = "ds_refresh";
const ACCESS_TOKEN_EXPIRY = "15m";
const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 15; // 15 minutes
const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const REFRESH_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 15; // 15 minutes

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
        .setExpirationTime(ACCESS_TOKEN_EXPIRY)
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
    cookieStore.set(ACCESS_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
        path: "/",
    });
}

export async function clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(ACCESS_COOKIE_NAME);
}

export async function getTokenFromCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(ACCESS_COOKIE_NAME)?.value ?? null;
}

export async function setRefreshCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(REFRESH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
        path: "/",
    });
}

export async function clearRefreshCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(REFRESH_COOKIE_NAME);
}

export async function getRefreshTokenFromCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null;
}

export async function clearAuthCookies() {
    await clearAuthCookie();
    await clearRefreshCookie();
}

export function generateSecureToken(size: number = 32): string {
    return crypto.randomBytes(size).toString("hex");
}

export async function createSession(params: { userId: string; ipAddress?: string | null; userAgent?: string | null }) {
    const refreshToken = generateSecureToken(48);
    const expiresAt = new Date(Date.now() + REFRESH_SESSION_TTL_MS);

    const session = await prisma.session.create({
        data: {
            userId: params.userId,
            refreshToken,
            expiresAt,
            ipAddress: params.ipAddress || null,
            userAgent: params.userAgent || null,
        },
    });

    return session;
}

export async function rotateSession(params: { refreshToken: string; ipAddress?: string | null; userAgent?: string | null }) {
    const existing = await prisma.session.findUnique({
        where: { refreshToken: params.refreshToken },
    });

    if (!existing) return null;
    if (existing.expiresAt.getTime() < Date.now()) {
        await prisma.session.delete({ where: { id: existing.id } }).catch(() => { });
        return null;
    }

    await prisma.session.delete({ where: { id: existing.id } });

    const rotated = await createSession({
        userId: existing.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
    });

    return rotated;
}

export async function revokeSession(refreshToken: string) {
    await prisma.session.deleteMany({ where: { refreshToken } });
}

export async function revokeAllUserSessions(userId: string) {
    await prisma.session.deleteMany({ where: { userId } });
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
            updatedAt: true,
            emailVerificationToken: {
                select: {
                    id: true,
                },
            },
        },
    });

    if (!user) return null;

    return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        city: user.city,
        phoneWhatsapp: user.phoneWhatsapp,
        createdAt: user.createdAt,
        // Compatibility fallback: if DB/client has no lastActiveAt yet, use updatedAt.
        lastActiveAt: (user as { lastActiveAt?: Date }).lastActiveAt ?? user.updatedAt,
        emailVerified: !user.emailVerificationToken,
    };
}

// ─── Get current user from token string (for middleware/API) ──────────────────
export async function getUserFromToken(token: string) {
    const payload = await verifyToken(token);
    if (!payload) return null;
    return payload;
}
