import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Lakukan dummy select 1 menggunakan native driver client untuk test ping database
        await prisma.$queryRaw`SELECT 1`;

        return NextResponse.json({
            status: "ok",
            database: "connected",
            timestamp: new Date().toISOString(),
        }, { status: 200 });

    } catch (err: unknown) {
        return NextResponse.json({
            status: "error",
            database: "disconnected",
            error: err instanceof Error ? err.message : "Unknown db error",
            timestamp: new Date().toISOString(),
        }, { status: 503 });
    }
}
