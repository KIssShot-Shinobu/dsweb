import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit-logger";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getAppUrl, getMaxFileSize, getUploadDir } from "@/lib/runtime-config";

const UPLOAD_DIR = getUploadDir();
const MAX_FILE_SIZE = getMaxFileSize();
const ALLOWED_EXTENSIONS = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export async function POST(request: NextRequest) {
    try {
        // Auth via JWT
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

        const fileExt = file.name.split('.').pop();
        const uuid = crypto.randomUUID();
        const uniqueFilename = `${Date.now()}-${uuid}.${fileExt}`;
        const uploadPath = path.resolve(UPLOAD_DIR);

        // Pastikan Root Directory tersedia
        await fs.mkdir(uploadPath, { recursive: true });

        // Tulis Buffer ke file FS lokal
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(path.join(uploadPath, uniqueFilename), buffer);

        const appUrl = getAppUrl();
        const publicUrl = `${appUrl}/uploads/${uniqueFilename}`;

        // Audit Logging Action
        await logAudit({
            userId: decoded.userId,
            action: "FILE_UPLOADED",
            targetType: "File",
            details: { size: file.size, type: file.type, url: publicUrl }
        });

        return NextResponse.json({ success: true, url: publicUrl }, { status: 200 });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
