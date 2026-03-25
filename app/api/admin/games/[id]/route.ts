import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { adminGameUpdateSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const parsed = adminGameUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
        }

        const { name, type, isOnline } = parsed.data;
        const game = await prisma.game.update({
            where: { id: params.id },
            data: {
                ...(typeof name === "string" ? { name } : {}),
                ...(typeof type === "string" ? { type: type || null } : {}),
                ...(typeof isOnline === "boolean" ? { isOnline } : {}),
            },
        });

        return NextResponse.json({ success: true, data: game }, { status: 200 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return NextResponse.json({ success: false, message: "Game tidak ditemukan" }, { status: 404 });
        }
        console.error("Error updating game:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
