import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { touchUserLastActiveAt } from "@/lib/prisma";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ success: true, authenticated: false, user: null }, { status: 200 });
    }
    await touchUserLastActiveAt(user.id);
    return NextResponse.json({ success: true, authenticated: true, user });
}
