import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { adminPartnerLogoUpdateSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeOptionalUrl(value?: string) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const parsed = adminPartnerLogoUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
        }

        const data = await prisma.partnerLogo.update({
            where: { id },
            data: {
                ...(typeof parsed.data.name === "string" ? { name: parsed.data.name } : {}),
                ...(typeof parsed.data.category === "string" ? { category: parsed.data.category } : {}),
                ...(typeof parsed.data.logoUrl === "string" ? { logoUrl: parsed.data.logoUrl } : {}),
                ...(typeof parsed.data.websiteUrl !== "undefined" ? { websiteUrl: normalizeOptionalUrl(parsed.data.websiteUrl) } : {}),
                ...(typeof parsed.data.isActive === "boolean" ? { isActive: parsed.data.isActive } : {}),
                ...(typeof parsed.data.sortOrder === "number" ? { sortOrder: parsed.data.sortOrder } : {}),
            },
        });

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        const isNotFound = typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2025";
        if (isNotFound) {
            return NextResponse.json({ success: false, message: "Data tidak ditemukan" }, { status: 404 });
        }
        console.error("Error updating partner logo:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    try {
        const { id } = await params;
        await prisma.partnerLogo.delete({ where: { id } });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        const isNotFound = typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2025";
        if (isNotFound) {
            return NextResponse.json({ success: false, message: "Data tidak ditemukan" }, { status: 404 });
        }
        console.error("Error deleting partner logo:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
