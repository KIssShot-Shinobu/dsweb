import { NextResponse } from "next/server";
import { hasRole, ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { tournamentParticipantsQuerySchema } from "@/lib/validators";

const DEFAULT_LIMIT = 20;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const parsed = tournamentParticipantsQuerySchema.safeParse({
            search: searchParams.get("search") ?? undefined,
            page: searchParams.get("page") ?? undefined,
            limit: searchParams.get("limit") ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Query tidak valid" }, { status: 400 });
        }

        const page = parsed.data.page ?? 1;
        const limit = parsed.data.limit ?? DEFAULT_LIMIT;
        const skip = (page - 1) * limit;
        const search = parsed.data.search?.toLowerCase();

        const where = {
            tournamentId: id,
            ...(search
                ? {
                      OR: [
                          { gameId: { contains: search } },
                          { user: { fullName: { contains: search } } },
                          { user: { username: { contains: search } } },
                          { user: { email: { contains: search } } },
                      ],
                  }
                : {}),
        };

        const [participants, total] = await Promise.all([
            prisma.tournamentParticipant.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                            discordId: true,
                            avatarUrl: true,
                        },
                    },
                },
                orderBy: { joinedAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.tournamentParticipant.count({ where }),
        ]);

        return NextResponse.json({ success: true, participants, total, page, limit });
    } catch (error) {
        console.error("[Tournament Participants]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
