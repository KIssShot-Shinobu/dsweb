import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { adminPartnerLogoCreateSchema } from "@/lib/validators";

function normalizeOptionalUrl(value?: string) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    try {
        const data = await prisma.partnerLogo.findMany({
            select: {
                id: true,
                name: true,
                category: true,
                logoUrl: true,
                websiteUrl: true,
                isActive: true,
                sortOrder: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        });

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        console.error("Error fetching partner logos:", error);
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
        const parsed = adminPartnerLogoCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
        }

        const maxOrder = await prisma.partnerLogo.aggregate({
            where: { category: parsed.data.category },
            _max: { sortOrder: true },
        });
        const nextSortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

        const data = await prisma.partnerLogo.create({
            data: {
                name: parsed.data.name,
                category: parsed.data.category,
                logoUrl: parsed.data.logoUrl,
                websiteUrl: normalizeOptionalUrl(parsed.data.websiteUrl),
                isActive: typeof parsed.data.isActive === "boolean" ? parsed.data.isActive : true,
                sortOrder: nextSortOrder,
            },
        });

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
        console.error("Error creating partner logo:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
