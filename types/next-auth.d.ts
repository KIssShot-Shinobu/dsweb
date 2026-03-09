import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface User {
        id: string;
        role: string;
        status: string;
        teamId: string | null;
        username: string;
        fullName: string;
        isEmailVerified: boolean;
    }

    interface Session {
        user: DefaultSession["user"] & {
            id: string;
            role: string;
            status: string;
            teamId: string | null;
            username: string;
            fullName: string;
            isEmailVerified: boolean;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        appUserId?: string;
        role?: string;
        status?: string;
        teamId?: string | null;
        username?: string;
        fullName?: string;
        isEmailVerified?: boolean;
    }
}

export {};

