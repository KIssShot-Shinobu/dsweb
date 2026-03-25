import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { adminGameCreateSchema } from "@/lib/validators";

export async function GET() {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    try {
        const games = await prisma.game.findMany({
            select: {
                id: true,
                code: true,
                name: true,
                type: true,
                isOnline: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({ success: true, data: games }, { status: 200 });
    } catch (error) {
        console.error("Error fetching admin games:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const parsed = adminGameCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
        }

        const { code, name, type, isOnline } = parsed.data;
        const game = await prisma.game.create({
            data: {
                code,
                name,
                type: type || null,
                isOnline: typeof isOnline === "boolean" ? isOnline : true,
            },
        });

        return NextResponse.json({ success: true, data: game }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ success: false, message: "Kode game sudah digunakan" }, { status: 409 });
        }
        console.error("Error creating game:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
