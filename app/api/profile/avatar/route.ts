import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { profileAvatarSchema } from "@/lib/validators";
import { deleteUploadFileByUrl, getUploadSegmentsFromUrl, resolveUploadFile } from "@/lib/upload-files";
import { getServerCurrentUser } from "@/lib/server-current-user";

export async function PATCH(request: NextRequest) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const parsed = profileAvatarSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 });
        }

        const nextAvatarUrl = parsed.data.avatarUrl;
        if (nextAvatarUrl) {
            const segments = getUploadSegmentsFromUrl(nextAvatarUrl);
            if (!segments || !resolveUploadFile(segments)) {
                return NextResponse.json({ success: false, message: "File avatar tidak ditemukan" }, { status: 400 });
            }
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: currentUser.id },
            select: { id: true, avatarUrl: true },
        });

        if (!existingUser) {
            return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
        }

        await prisma.user.update({
            where: { id: currentUser.id },
            data: {
                avatarUrl: nextAvatarUrl,
            },
        });

        if (existingUser.avatarUrl && existingUser.avatarUrl !== nextAvatarUrl) {
            await deleteUploadFileByUrl(existingUser.avatarUrl);
        }

        await logAudit({
            userId: currentUser.id,
            action: "PROFILE_UPDATED",
            targetId: currentUser.id,
            targetType: "User",
            details: {
                avatarChanged: true,
                hasAvatar: Boolean(nextAvatarUrl),
            },
        });

        return NextResponse.json({
            success: true,
            avatarUrl: nextAvatarUrl,
            message: nextAvatarUrl ? "Foto profil berhasil diperbarui." : "Foto profil berhasil dihapus.",
        });
    } catch (error) {
        console.error("[Profile Avatar API]", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
