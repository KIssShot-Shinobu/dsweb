import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { teamSchema, teamsQuerySchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "OFFICER")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = teamsQuerySchema.safeParse({
        search: searchParams.get("search") || undefined,
        status: searchParams.get("status") || undefined,
    });

    if (!parsedQuery.success) {
        return NextResponse.json({ success: false, message: "Filter team tidak valid" }, { status: 400 });
    }

    const { search = "", status = "ALL" } = parsedQuery.data;
    const where = {
        ...(search
            ? {
                  OR: [
                      { name: { contains: search } },
                      { slug: { contains: search } },
                      { description: { contains: search } },
                  ],
              }
            : {}),
        ...(status === "ACTIVE" ? { isActive: true } : status === "INACTIVE" ? { isActive: false } : {}),
    };

    const teams = await prisma.team.findMany({
        where,
        select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logoUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { members: true } },
        },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({
        success: true,
        data: teams.map((team) => ({
            ...team,
            memberCount: team._count.members,
        })),
    });
}

export async function POST(req: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasRole(currentUser.role, "ADMIN")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = teamSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { name, slug, description, logoUrl, isActive = true } = parsed.data;
    const existingSlug = await prisma.team.findUnique({ where: { slug } });
    if (existingSlug) {
        return NextResponse.json({ success: false, message: "Slug team sudah dipakai" }, { status: 409 });
    }

    const team = await prisma.team.create({
        data: {
            name,
            slug,
            description: description || null,
            logoUrl: logoUrl || null,
            isActive,
        },
    });

    await logAudit({
        userId: currentUser.id,
        action: AUDIT_ACTIONS.TEAM_CREATED,
        targetId: team.id,
        targetType: "TEAM",
        details: { name: team.name, slug: team.slug, isActive: team.isActive },
    });

    return NextResponse.json({ success: true, data: team }, { status: 201 });
}
