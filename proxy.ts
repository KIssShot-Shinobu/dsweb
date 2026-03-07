import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getJwtSecret() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error("JWT_SECRET is required");
    }

    return new TextEncoder().encode(jwtSecret);
}
const COOKIE_NAME = "ds_auth";

const ROLE_LEVEL: Record<string, number> = {
    USER: 0,
    MEMBER: 1,
    OFFICER: 2,
    ADMIN: 3,
    FOUNDER: 4,
};

// Legacy paths remain protected here while they continue to redirect.
const PROTECTED_ROUTES: { pattern: RegExp; minRole: string }[] = [
    { pattern: /^\/dashboard\/admin(\/|$)/, minRole: "ADMIN" },
    { pattern: /^\/dashboard\/members(\/|$)/, minRole: "OFFICER" },
    { pattern: /^\/dashboard\/tournaments(\/|$)/, minRole: "ADMIN" },
    { pattern: /^\/dashboard\/treasury(\/|$)/, minRole: "ADMIN" },
    { pattern: /^\/dashboard(\/|$)/, minRole: "USER" },
];

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const protectedRoute = PROTECTED_ROUTES.find((route) => route.pattern.test(pathname));
    if (!protectedRoute) return NextResponse.next();

    const token = req.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        const userRole = (payload.role as string) ?? "USER";
        const userStatus = (payload.status as string) ?? "ACTIVE";
        if (userStatus !== "ACTIVE" && !["ADMIN", "FOUNDER"].includes(userRole)) {
            const loginUrl = new URL("/login", req.url);            if (userStatus === "BANNED") loginUrl.searchParams.set("error", "banned");
            return NextResponse.redirect(loginUrl);
        }

        if ((ROLE_LEVEL[userRole] ?? 0) < (ROLE_LEVEL[protectedRoute.minRole] ?? 99)) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        const res = NextResponse.next();
        res.headers.set("x-user-id", payload.userId as string);
        res.headers.set("x-user-role", userRole);
        return res;
    } catch {
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
