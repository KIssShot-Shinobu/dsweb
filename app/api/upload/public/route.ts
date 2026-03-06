import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit-logger";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "5242880", 10); // 5MB
const ALLOWED_EXTENSIONS = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export async function POST(request: NextRequest) {
    try {
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

        const fileExt = file.name.split(".").pop();
        const uuid = crypto.randomUUID();
        const uniqueFilename = `${Date.now()}-${uuid}.${fileExt}`;
        const uploadPath = path.resolve(UPLOAD_DIR);

        await fs.mkdir(uploadPath, { recursive: true });
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(path.join(uploadPath, uniqueFilename), buffer);

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const publicUrl = `${appUrl}/uploads/${uniqueFilename}`;

        await logAudit({
            userId: "0",
            action: "FILE_UPLOADED",
            targetType: "File",
            details: { size: file.size, type: file.type, url: publicUrl, source: "PUBLIC_REGISTER_UPLOAD" },
        });

        return NextResponse.json({ success: true, url: publicUrl }, { status: 200 });
    } catch (error) {
        console.error("Public upload error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}

