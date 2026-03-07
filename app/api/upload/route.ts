import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getMaxFileSize, getPermanentUploadTargets } from "@/lib/runtime-config";

const MAX_FILE_SIZE = getMaxFileSize();
const ALLOWED_EXTENSIONS = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MIME_EXTENSION_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
} as const;

export async function POST(request: NextRequest) {
    try {
        const decoded = await verifyToken(request.cookies.get("ds_auth")?.value || "");
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        if (!file) {
            return NextResponse.json({ success: false, message: "File required" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ success: false, message: "File melebihi maksimal ukuran (5MB)" }, { status: 400 });
        }

        if (!ALLOWED_EXTENSIONS.includes(file.type)) {
            return NextResponse.json({ success: false, message: "Format tidak didukung. Harap gunakan PNG, JPG, atau WEBP" }, { status: 400 });
        }

        const fileExt = MIME_EXTENSION_MAP[file.type as keyof typeof MIME_EXTENSION_MAP] || "jpg";
        const uuid = crypto.randomUUID();
        const uniqueFilename = `${Date.now()}-${uuid}.${fileExt}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadTargets = getPermanentUploadTargets();

        await Promise.all(
            uploadTargets.map(async (targetDir) => {
                await fs.mkdir(targetDir, { recursive: true });
                await fs.writeFile(path.join(targetDir, uniqueFilename), buffer);
            })
        );

        const publicPath = `/uploads/${uniqueFilename}`;

        await logAudit({
            userId: decoded.userId,
            action: "FILE_UPLOADED",
            targetType: "File",
            details: { size: file.size, type: file.type, url: publicPath },
        });

        return NextResponse.json({ success: true, url: publicPath }, { status: 200 });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
