import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Only allowed in development!
export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
    }

    try {
        const hash = await bcrypt.hash("Admin123!", 12);
        const user = await prisma.user.upsert({
            where: { email: "admin@duelstandby.com" },
            update: {},
            create: {
                fullName: "Admin Duel Standby",
                email: "admin@duelstandby.com",
                password: hash,
                phoneWhatsapp: "+628000000001",
                city: "Jakarta",
                status: "ACTIVE",
                role: "ADMIN",
            },
        });
        return NextResponse.json({
            success: true,
            message: "Admin seeded!",
            email: user.email,
            note: "Password: Admin123! — CHANGE AFTER FIRST LOGIN",
        });
    } catch (e) {
        const err = e as Error;
        return NextResponse.json({ success: false, error: err.message, stack: err.stack?.slice(0, 500) }, { status: 500 });
    }
}

