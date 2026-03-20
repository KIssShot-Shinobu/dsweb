import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { matchMessageUpdateSchema } from "@/lib/validators";
import { deleteUploadFileByUrl } from "@/lib/upload-files";

const EDIT_WINDOW_MS = 3 * 60 * 1000;

const normalizeUrls = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

async function loadMessage(matchId: string, messageId: string) {
    return prisma.matchMessage.findUnique({
        where: { id: messageId },
        select: {
            id: true,
            matchId: true,
            senderId: true,
            content: true,
            attachmentUrls: true,
            createdAt: true,
            editedAt: true,
            match: { select: { status: true } },
        },
    });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id, messageId } = await params;
        const message = await loadMessage(id, messageId);

        if (!message || message.matchId !== id) {
            return NextResponse.json({ success: false, message: "Pesan tidak ditemukan" }, { status: 404 });
        }

        if (message.match.status === "COMPLETED") {
            return NextResponse.json({ success: false, message: "Match sudah selesai" }, { status: 400 });
        }

        if (message.senderId !== currentUser.id) {
            return NextResponse.json({ success: false, message: "Anda tidak punya akses mengubah pesan ini" }, { status: 403 });
        }

        const editDeadline = message.createdAt.getTime() + EDIT_WINDOW_MS;
        if (Date.now() > editDeadline) {
            return NextResponse.json({ success: false, message: "Batas waktu edit sudah lewat" }, { status: 403 });
        }

        const body = await request.json();
        const parsed = matchMessageUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: "Validasi gagal", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
        }

        const updates: Record<string, unknown> = {
            editedAt: new Date(),
        };

        if (parsed.data.content !== undefined) {
            updates.content = parsed.data.content;
        }

        if (parsed.data.attachmentUrls !== undefined) {
            const previousUrls = normalizeUrls(message.attachmentUrls);
            const nextUrls = normalizeUrls(parsed.data.attachmentUrls);

            const removedUrls = previousUrls.filter((url) => !nextUrls.includes(url));
            if (removedUrls.length > 0) {
                await Promise.allSettled(removedUrls.map((url) => deleteUploadFileByUrl(url)));
            }

            updates.attachmentUrls = nextUrls;
        }

        const updated = await prisma.matchMessage.update({
            where: { id: message.id },
            data: updates,
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

        return NextResponse.json({ success: true, message: updated }, { status: 200 });
    } catch (error) {
        console.error("[Match Message Update]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { id, messageId } = await params;
        const message = await loadMessage(id, messageId);

        if (!message || message.matchId !== id) {
            return NextResponse.json({ success: false, message: "Pesan tidak ditemukan" }, { status: 404 });
        }

        if (message.match.status === "COMPLETED") {
            return NextResponse.json({ success: false, message: "Match sudah selesai" }, { status: 400 });
        }

        if (message.senderId !== currentUser.id) {
            return NextResponse.json({ success: false, message: "Anda tidak punya akses menghapus pesan ini" }, { status: 403 });
        }

        const editDeadline = message.createdAt.getTime() + EDIT_WINDOW_MS;
        if (Date.now() > editDeadline) {
            return NextResponse.json({ success: false, message: "Batas waktu hapus sudah lewat" }, { status: 403 });
        }

        const attachments = normalizeUrls(message.attachmentUrls);
        if (attachments.length > 0) {
            await Promise.allSettled(attachments.map((url) => deleteUploadFileByUrl(url)));
        }

        await prisma.matchMessage.delete({ where: { id: message.id } });

        return NextResponse.json({ success: true, message: "Pesan dihapus" }, { status: 200 });
    } catch (error) {
        console.error("[Match Message Delete]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
