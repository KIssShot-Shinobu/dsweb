import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { canAccessMatchChat } from "@/lib/match-chat";
import { matchMessageSchema } from "@/lib/validators";
import { createNotificationService } from "@/lib/services/notification.service";
import { resolveMatchNotificationRecipients } from "@/lib/services/match-notification";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const normalizeLimit = (value: string | null) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
    return Math.min(MAX_LIMIT, Math.floor(parsed));
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const match = await prisma.match.findUnique({
            where: { id },
            select: {
                tournamentId: true,
                playerA: { select: { userId: true, teamId: true } },
                playerB: { select: { userId: true, teamId: true } },
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        const allowed = await canAccessMatchChat(currentUser, match);
        if (!allowed) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const limit = normalizeLimit(searchParams.get("limit"));

        const messages = await prisma.matchMessage.findMany({
            where: { matchId: id },
            orderBy: { createdAt: "asc" },
            take: limit,
            select: {
                id: true,
                content: true,
                attachmentUrls: true,
                createdAt: true,
                editedAt: true,
                sender: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatarUrl: true,
                        role: true,
                    },
                },
            },
        });

        return NextResponse.json({ success: true, messages }, { status: 200 });
    } catch (error) {
        console.error("[Match Messages]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const match = await prisma.match.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                tournamentId: true,
                playerA: { select: { userId: true, teamId: true } },
                playerB: { select: { userId: true, teamId: true } },
            },
        });

        if (!match) {
            return NextResponse.json({ success: false, message: "Match tidak ditemukan" }, { status: 404 });
        }

        const allowed = await canAccessMatchChat(currentUser, match);
        if (!allowed) {
            return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
        }

        if (match.status === "COMPLETED") {
            return NextResponse.json({ success: false, message: "Match sudah selesai" }, { status: 400 });
        }

        const body = await request.json();
        const parsed = matchMessageSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const hasAttachmentField = Object.prototype.hasOwnProperty.call(parsed.data, "attachmentUrls");
        const attachmentUrls = parsed.data.attachmentUrls ?? [];

        const message = await prisma.matchMessage.create({
            data: {
                matchId: match.id,
                senderId: currentUser.id,
                content: parsed.data.content,
                ...(hasAttachmentField ? { attachmentUrls } : {}),
            },
            select: {
                id: true,
                content: true,
                attachmentUrls: true,
                createdAt: true,
                editedAt: true,
                sender: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatarUrl: true,
                        role: true,
                    },
                },
            },
        });

        const recipients = await resolveMatchNotificationRecipients(prisma, match.tournamentId, [
            { userId: match.playerA?.userId ?? null, teamId: match.playerA?.teamId ?? null },
            { userId: match.playerB?.userId ?? null, teamId: match.playerB?.teamId ?? null },
        ]);

        const notifyIds = recipients.filter((userId) => userId !== currentUser.id);
        if (notifyIds.length > 0) {
            const notifications = createNotificationService({ prisma });
            await Promise.allSettled(
                notifyIds.map((userId) =>
                    notifications.createNotification({
                        userId,
                        type: "SYSTEM_ALERT",
                        title: "Pesan Match Baru",
                        message: "Ada pesan baru di match kamu. Buka halaman turnamen untuk melihat detail.",
                        link: `/tournaments/${match.tournamentId}`,
                    })
                )
            );
        }

        return NextResponse.json({ success: true, message }, { status: 201 });
    } catch (error) {
        console.error("[Match Messages]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
