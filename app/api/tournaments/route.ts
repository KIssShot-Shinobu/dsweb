import { NextRequest, NextResponse } from "next/server";
import { verifyToken, hasRole, ROLES } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { tournamentSchema } from "@/lib/validators";

// GET /api/tournaments - Fetch all tournaments
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const where: any = {};
        if (status) where.status = status;

        const tournaments = await prisma.tournament.findMany({
            where,
            orderBy: { startDate: "desc" },
            include: {
                _count: {
                    select: { participants: true }
                }
            }
        });

        return NextResponse.json({ success: true, tournaments }, { status: 200 });
    } catch (error) {
        console.error("Error fetching tournaments:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}

// POST /api/tournaments - Create a new tournament
export async function POST(request: NextRequest) {
    try {
        // SECURITY: Verify token and role
        const decoded = await verifyToken(request.cookies.get("ds_auth")?.value || "");
        if (!decoded || !hasRole(decoded.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses Ditolak. Minimal Officer." }, { status: 403 });
        }

        const body = await request.json();
        const validBody = tournamentSchema.safeParse(body);

        if (!validBody.success) {
            return NextResponse.json({ success: false, message: validBody.error.issues[0].message }, { status: 400 });
        }

        const data = validBody.data;

        const tournament = await prisma.tournament.create({
            data: {
                title: data.title,
                description: data.description,
                format: data.format,
                gameType: data.gameType,
                status: data.status || "OPEN",
                entryFee: data.entryFee,
                prizePool: data.prizePool,
                startDate: new Date(data.startDate),
                image: data.image
            }
        });

        // AUDIT LOG
        await logAudit({
            userId: decoded.userId,
            action: "TOURNAMENT_CREATED",
            targetId: tournament.id,
            targetType: "Tournament",
            details: { title: tournament.title, gameType: tournament.gameType, format: tournament.format }
        });

        return NextResponse.json({ success: true, tournament }, { status: 201 });
    } catch (error) {
        console.error("Error creating tournament:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
