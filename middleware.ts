import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "duel-standby-secret-key-change-in-production"
);
const COOKIE_NAME = "ds_auth";

const ROLE_LEVEL: Record<string, number> = {
    USER: 0,
    MEMBER: 1,
    OFFICER: 2,
    ADMIN: 3,
    FOUNDER: 4,
};

// Routes that require authentication and minimum role
const PROTECTED_ROUTES: { pattern: RegExp; minRole: string }[] = [
    // Admin routes — ADMIN only
    { pattern: /^\/dashboard\/admin(\/|$)/, minRole: "ADMIN" },
    // Guild management — OFFICER+
    { pattern: /^\/dashboard\/members(\/|$)/, minRole: "OFFICER" },
    { pattern: /^\/dashboard\/tournaments(\/|$)/, minRole: "ADMIN" },
    { pattern: /^\/dashboard\/treasury(\/|$)/, minRole: "ADMIN" },
    // General dashboard — any logged in user
    { pattern: /^\/dashboard(\/|$)/, minRole: "USER" },
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Find matching protected route
    const protectedRoute = PROTECTED_ROUTES.find((r) => r.pattern.test(pathname));
    if (!protectedRoute) return NextResponse.next();

    // Get token from cookie
    const token = req.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userRole = (payload.role as string) ?? "USER";
        const userStatus = (payload.status as string) ?? "PENDING";

        // Only ACTIVE users can access dashboard (admins bypass)
        if (userStatus !== "ACTIVE" && !["ADMIN", "FOUNDER"].includes(userRole)) {
            const loginUrl = new URL("/login", req.url);
            loginUrl.searchParams.set("error", "pending");
            return NextResponse.redirect(loginUrl);
        }

        // Check minimum role level
        if ((ROLE_LEVEL[userRole] ?? 0) < (ROLE_LEVEL[protectedRoute.minRole] ?? 99)) {
            // Redirect to dashboard home if not enough permission
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        // Attach user info to headers for server components
        const res = NextResponse.next();
        res.headers.set("x-user-id", payload.userId as string);
        res.headers.set("x-user-role", userRole);
        return res;
    } catch {
        // Invalid/expired token
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        const res = NextResponse.redirect(loginUrl);
        res.cookies.delete(COOKIE_NAME);
        return res;
    }
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
