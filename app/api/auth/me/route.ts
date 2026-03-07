import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { touchUserLastActiveAt } from "@/lib/prisma";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    await touchUserLastActiveAt(user.id);
    return NextResponse.json({ success: true, user });
}
