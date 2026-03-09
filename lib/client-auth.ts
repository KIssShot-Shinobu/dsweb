"use client";

import { signOut } from "next-auth/react";

export async function clientLogout(redirectTo: string = "/login") {
    await fetch("/api/auth/logout", { method: "POST" });

    try {
        await signOut({ redirect: false });
    } catch {
        // Ignore Auth.js sign-out failures so JWT logout still completes.
    }

    window.location.href = redirectTo;
}
