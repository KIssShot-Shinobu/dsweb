import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { hasRole, ROLES } from "@/lib/auth";

const DEFAULT_LIMIT = 8;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const search = (searchParams.get("search") || "").trim();
        const limit = Math.min(DEFAULT_LIMIT, Number(searchParams.get("limit") || DEFAULT_LIMIT)) || DEFAULT_LIMIT;

        const assigned = await prisma.tournamentStaff.findMany({
            where: { tournamentId: id },
            select: { userId: true },
        });
        const assignedIds = assigned.map((item) => item.userId);

        const where: Prisma.UserWhereInput = {
            status: "ACTIVE",
            ...(assignedIds.length ? { id: { notIn: assignedIds } } : {}),
            ...(search
                ? {
                      OR: [
                          { fullName: { contains: search } },
                          { email: { contains: search } },
                          { username: { contains: search } },
                      ],
                  }
                : {}),
        };

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                role: true,
                status: true,
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        return NextResponse.json({ success: true, data: users }, { status: 200 });
    } catch (error) {
        console.error("[Tournament Staff Candidates]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

