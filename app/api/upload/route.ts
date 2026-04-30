import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit-logger";
import { buildR2PublicUrl, putR2Object } from "@/lib/r2-storage";
import { getMaxFileSize, isR2Enabled } from "@/lib/runtime-config";
import { getServerCurrentUser } from "@/lib/server-current-user";

const MAX_FILE_SIZE = getMaxFileSize();
const DEFAULT_ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"] as const;
const LOGO_ALLOWED_MIME_TYPES = [...DEFAULT_ALLOWED_MIME_TYPES, "image/svg+xml"] as const;
const MIME_EXTENSION_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
} as const;

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getServerCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const uploadPurpose = typeof formData.get("purpose") === "string" ? String(formData.get("purpose")) : "";
        const allowsSvg = uploadPurpose === "logo";
        const allowedMimeTypes = allowsSvg ? LOGO_ALLOWED_MIME_TYPES : DEFAULT_ALLOWED_MIME_TYPES;
        if (!file) {
            return NextResponse.json({ success: false, message: "File required" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ success: false, message: "File melebihi maksimal ukuran (5MB)" }, { status: 400 });
        }

        if (!allowedMimeTypes.includes(file.type as (typeof allowedMimeTypes)[number])) {
            return NextResponse.json(
                { success: false, message: allowsSvg ? "Format tidak didukung. Harap gunakan PNG, JPG, WEBP, atau SVG" : "Format tidak didukung. Harap gunakan PNG, JPG, atau WEBP" },
                { status: 400 }
            );
        }

        if (!isR2Enabled()) {
            return NextResponse.json({ success: false, message: "R2 upload belum diaktifkan" }, { status: 503 });
        }

        const fileExt = MIME_EXTENSION_MAP[file.type as keyof typeof MIME_EXTENSION_MAP] || "jpg";
        const uuid = crypto.randomUUID();
        const uniqueFilename = `${Date.now()}-${uuid}.${fileExt}`;
        const objectKey = `uploads/${uniqueFilename}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        await putR2Object({
            key: objectKey,
            body: buffer,
            contentType: file.type,
        });

        const publicPath = buildR2PublicUrl(objectKey);

        await logAudit({
            userId: currentUser.id,
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
