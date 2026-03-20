import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { hasRole, ROLES } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser || !hasRole(currentUser.role, ROLES.OFFICER)) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { id } = await params;
        const seeds = await prisma.tournamentParticipant.findMany({
            where: { tournamentId: id, seed: { not: null } },
            select: {
                id: true,
                seed: true,
                guestName: true,
                user: { select: { id: true, fullName: true, username: true } },
            },
            orderBy: { seed: "asc" },
        });

        const unseededCount = await prisma.tournamentParticipant.count({
            where: { tournamentId: id, seed: null },
        });

        const normalized = seeds.map((entry) => ({
            seed: entry.seed,
            participant: {
                id: entry.id,
                name: entry.user?.username || entry.user?.fullName || entry.guestName || "Guest",
            },
        }));

        return NextResponse.json({ success: true, seeds: normalized, unseededCount }, { status: 200 });
    } catch (error) {
        console.error("[Tournament Seeds]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
