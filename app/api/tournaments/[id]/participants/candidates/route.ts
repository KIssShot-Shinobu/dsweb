import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: { id: true, createdById: true },
        });

        if (!tournament) {
            return NextResponse.json({ success: false, message: "Turnamen tidak ditemukan" }, { status: 404 });
        }

        if (!hasRole(currentUser.role, ROLES.OFFICER) && currentUser.id !== tournament.createdById) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const search = (searchParams.get("search") ?? "").trim();
        if (search.length < 2) {
            return NextResponse.json({ success: true, users: [] }, { status: 200 });
        }

        const users = await prisma.user.findMany({
            where: {
                status: "ACTIVE",
                OR: [
                    { fullName: { contains: search } },
                    { username: { contains: search } },
                    { email: { contains: search } },
                ],
                tournaments: {
                    none: { tournamentId: id },
                },
            },
            select: {
                id: true,
                fullName: true,
                username: true,
                email: true,
                avatarUrl: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        });

        return NextResponse.json({ success: true, users }, { status: 200 });
    } catch (error) {
        console.error("[Tournament Participants Candidates]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
