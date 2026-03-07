import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-logger";
import { createPendingRegisterUpload } from "@/lib/upload-security";
import { extractRequestIp } from "@/lib/request-ip";
import { getMaxFileSize } from "@/lib/runtime-config";

const MAX_FILE_SIZE = getMaxFileSize();

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ success: false, message: "File required" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, message: "File melebihi maksimal ukuran upload" },
                { status: 400 }
            );
        }

        const upload = await createPendingRegisterUpload({
            prisma,
            buffer: Buffer.from(await file.arrayBuffer()),
            originalName: file.name,
            declaredMimeType: file.type,
            ipAddress: extractRequestIp(request.headers),
        });

        await logAudit({
            userId: "0",
            action: "PUBLIC_UPLOAD_TEMP_CREATED",
            targetType: "PendingUpload",
            targetId: upload.id,
            details: {
                source: "REGISTER_SCREENSHOT",
                mimeType: upload.mimeType,
                size: upload.size,
                expiresAt: upload.expiresAt.toISOString(),
            },
        });

        return NextResponse.json(
            {
                success: true,
                uploadId: upload.id,
                previewUrl: upload.previewUrl,
                expiresAt: upload.expiresAt.toISOString(),
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof Error) {
            const status = error.message.includes("Batas upload publik tercapai") ? 429 : 400;
            return NextResponse.json({ success: false, message: error.message }, { status });
        }

        console.error("Public upload error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
