import { promises as fs } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { resolveUploadFile } from "@/lib/upload-files";

type RouteContext = {
    params: Promise<{ path: string[] }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: RouteContext) {
    try {
        const { path } = await context.params;
        const resolved = resolveUploadFile(path);

        if (!resolved) {
            return new NextResponse("Not Found", { status: 404 });
        }

        const file = await fs.readFile(resolved.filePath);
        return new NextResponse(file, {
            status: 200,
            headers: {
                "Content-Type": resolved.mimeType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Upload asset error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
