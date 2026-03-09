import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { logAudit } from "@/lib/audit-logger";
import { comparePassword, generateSecureToken, hashPassword } from "@/lib/auth";
import { authenticateUser } from "@/lib/services/auth-service";
import { syncGoogleUser } from "@/lib/services/auth-oauth-service";

type AuthAppUser = {
    id: string;
    email: string;
    username: string;
    fullName: string;
    role: string;
    status: string;
    teamId: string | null;
    emailVerifiedAt: Date | null;
};

async function resolveAppUser(googleId?: string | null, email?: string | null) {
    if (!googleId && !email) {
        return null;
    }

    const whereClauses: Array<Record<string, string>> = [
        ...(googleId ? [{ googleId }] : []),
        ...(email ? [{ email: email.toLowerCase() }] : []),
    ];

    return prisma.user.findFirst({
        where: {
            OR: whereClauses,
        } as never,
        select: {
            id: true,
            email: true,
            username: true,
            fullName: true,
            role: true,
            status: true,
            teamId: true,
            emailVerifiedAt: true,
        },
    }) as Promise<AuthAppUser | null>;
}

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;

class InvalidCredentialsAuthError extends CredentialsSignin {
    code = "invalid_credentials";
}

class BannedCredentialsAuthError extends CredentialsSignin {
    code = "banned";
}

class AccessDeniedCredentialsAuthError extends CredentialsSignin {
    code = "access_denied";
}

const providers: any[] = [
    Credentials({
        name: "Credentials",
        credentials: {
            identifier: { label: "Username atau Email", type: "text" },
            password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
            const identifier = typeof credentials?.identifier === "string" ? credentials.identifier.trim() : "";
            const password = typeof credentials?.password === "string" ? credentials.password : "";

            if (!identifier || !password) {
                throw new InvalidCredentialsAuthError();
            }

            const authResult = await authenticateUser(
                { prisma: prisma as never, comparePassword },
                { identifier, password }
            );

            if (!authResult.ok) {
                await logAudit({
                    action: AUDIT_ACTIONS.LOGIN_FAILED,
                    userId: authResult.userId,
                    details: { provider: "credentials", identifier, reason: authResult.code },
                });

                if (authResult.code === "INVALID_CREDENTIALS") {
                    throw new InvalidCredentialsAuthError();
                }

                if (authResult.code === "BANNED") {
                    throw new BannedCredentialsAuthError();
                }

                throw new AccessDeniedCredentialsAuthError();
            }

            return {
                id: authResult.user.id,
                email: authResult.user.email,
                username: authResult.user.username,
                fullName: authResult.user.fullName,
                role: authResult.user.role,
                status: authResult.user.status,
                teamId: authResult.user.teamId ?? null,
                isEmailVerified: Boolean(authResult.user.emailVerifiedAt),
            };
        },
    }),
];

if (googleClientId && googleClientSecret) {
    providers.push(
        Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
        })
    );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers,
    callbacks: {
        async signIn({ account, profile }) {
            if (account?.provider === "credentials") {
                return true;
            }

            if (account?.provider !== "google") {
                return false;
            }

            const googleProfile = profile as Record<string, unknown> | undefined;
            const result = await syncGoogleUser(
                {
                    prisma: prisma as never,
                    hashPassword,
                    generateSecureToken,
                },
                {
                    googleId: account.providerAccountId,
                    email: typeof googleProfile?.email === "string" ? googleProfile.email : null,
                    name: typeof googleProfile?.name === "string" ? googleProfile.name : null,
                    image: typeof googleProfile?.picture === "string" ? googleProfile.picture : null,
                    emailVerified: Boolean(googleProfile?.email_verified),
                }
            );

            if (!result.ok) {
                if (result.code === "BANNED") {
                    await logAudit({
                        action: AUDIT_ACTIONS.LOGIN_FAILED,
                        userId: result.user?.id,
                        details: { provider: "google", reason: "User is banned" },
                    });
                    return "/login?error=banned";
                }

                return "/login?error=oauth_failed";
            }

            if (result.outcome === "created") {
                await logAudit({
                    action: AUDIT_ACTIONS.OAUTH_GOOGLE_ACCOUNT_CREATED,
                    userId: result.user.id,
                    targetId: result.user.id,
                    targetType: "User",
                    details: { provider: "google", email: result.user.email },
                });
            }

            if (result.outcome === "linked") {
                await logAudit({
                    action: AUDIT_ACTIONS.OAUTH_GOOGLE_ACCOUNT_LINKED,
                    userId: result.user.id,
                    targetId: result.user.id,
                    targetType: "User",
                    details: { provider: "google", email: result.user.email },
                });
            }

            return true;
        },
        async jwt({ token, account, user }) {
            if (account?.provider === "credentials" && user) {
                token.appUserId = typeof user.id === "string" ? user.id : "";
                token.role = typeof user.role === "string" ? user.role : "USER";
                token.status = typeof user.status === "string" ? user.status : "ACTIVE";
                token.teamId = typeof user.teamId === "string" ? user.teamId : null;
                token.username =
                    typeof user.username === "string"
                        ? user.username
                        : typeof user.name === "string"
                            ? user.name
                            : typeof user.email === "string"
                                ? user.email
                                : "user";
                token.fullName =
                    typeof user.fullName === "string"
                        ? user.fullName
                        : typeof user.name === "string"
                            ? user.name
                            : typeof user.email === "string"
                                ? user.email
                                : "User";
                token.isEmailVerified = Boolean(user.isEmailVerified);
            }

            if (account?.provider === "google") {
                const appUser = await resolveAppUser(
                    account.providerAccountId,
                    typeof token.email === "string" ? token.email : null
                );

                if (appUser) {
                    token.appUserId = appUser.id;
                    token.role = appUser.role;
                    token.status = appUser.status;
                    token.teamId = appUser.teamId;
                    token.username = appUser.username;
                    token.fullName = appUser.fullName;
                    token.isEmailVerified = Boolean(appUser.emailVerifiedAt);
                }
            }

            if (!token.appUserId && typeof token.email === "string") {
                const appUser = await resolveAppUser(null, token.email);
                if (appUser) {
                    token.appUserId = appUser.id;
                    token.role = appUser.role;
                    token.status = appUser.status;
                    token.teamId = appUser.teamId;
                    token.username = appUser.username;
                    token.fullName = appUser.fullName;
                    token.isEmailVerified = Boolean(appUser.emailVerifiedAt);
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user = {
                    ...session.user,
                    id: typeof token.appUserId === "string" ? token.appUserId : "",
                    role: typeof token.role === "string" ? token.role : "USER",
                    status: typeof token.status === "string" ? token.status : "ACTIVE",
                    teamId: typeof token.teamId === "string" ? token.teamId : null,
                    username:
                        typeof token.username === "string"
                            ? token.username
                            : session.user.name || session.user.email || "user",
                    fullName:
                        typeof token.fullName === "string"
                            ? token.fullName
                            : session.user.name || session.user.email || "User",
                    isEmailVerified: Boolean(token.isEmailVerified),
                };
            }

            return session;
        },
    },
});

