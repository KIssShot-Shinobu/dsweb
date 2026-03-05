import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Increase body size limit for file uploads (Next.js App Router)
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    try {
        let formData: FormData;
        try {
            formData = await request.formData();
        } catch {
            return NextResponse.json(
                { error: "Could not parse form data. Make sure the request is multipart/form-data." },
                { status: 400 }
            );
        }

        const file = formData.get("file") as File | null;

        if (!file || file.size === 0) {
            return NextResponse.json(
                { error: "No file provided or file is empty." },
                { status: 400 }
            );
        }

        // Accept all image types (mobile + desktop)
        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { error: `File type "${file.type || "unknown"}" is not allowed. Please upload an image.` },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB — allowing larger phone photos)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 10MB.` },
                { status: 400 }
            );
        }

        // Use __dirname-based path which is stable in all Next.js modes
        // process.cwd() = project root in dev, .next/standalone in production
        const projectRoot = process.env.NEXT_PUBLIC_PROJECT_ROOT || process.cwd();
        const uploadDir = path.join(projectRoot, "public", "uploads", "tournaments");

        console.log("[upload] cwd:", process.cwd());
        console.log("[upload] uploadDir:", uploadDir);
        console.log("[upload] file:", file.name, file.type, file.size, "bytes");

        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
            console.log("[upload] created directory:", uploadDir);
        }

        // Derive file extension
        const mimeToExt: Record<string, string> = {
            "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
            "image/webp": "webp", "image/gif": "gif", "image/heic": "heic",
            "image/heif": "heif", "image/avif": "avif", "image/bmp": "bmp",
        };
        const extFromName = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : undefined;
        const ext = (extFromName && extFromName.length <= 5) ? extFromName : (mimeToExt[file.type] || "jpg");
        const filename = `tournament-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filepath = path.join(uploadDir, filename);

        // Write file
        const bytes = await file.arrayBuffer();
        await writeFile(filepath, Buffer.from(bytes));
        console.log("[upload] saved to:", filepath);

        const url = `/uploads/tournaments/${filename}`;
        return NextResponse.json({ url, filename, size: file.size }, { status: 201 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[upload] Error:", message);
        return NextResponse.json(
            { error: `Upload failed: ${message}` },
            { status: 500 }
        );
    }
}
