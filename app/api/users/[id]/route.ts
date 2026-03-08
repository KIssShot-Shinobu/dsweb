import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            fullName: true,
            email: true,
            phoneWhatsapp: true,
            city: true,
            status: true,
            role: true,
            teamId: true,
            teamJoinedAt: true,
            createdAt: true,
            lastLoginAt: true,
            gameProfiles: true,
            registrationLog: true,
            team: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    isActive: true,
                },
            },
            auditLogs: {
                select: {
                    action: true,
                    reason: true,
                    createdAt: true,
                    user: { select: { fullName: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            },
        },
    });

    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
}
