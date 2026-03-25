import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const games = await prisma.game.findMany({
            where: { isOnline: true },
            select: {
                id: true,
                code: true,
                name: true,
                type: true,
                isOnline: true,
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({ success: true, data: games }, { status: 200 });
    } catch (error) {
        console.error("Error fetching games:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
