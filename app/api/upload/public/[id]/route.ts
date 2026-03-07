import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractRequestIp } from "@/lib/request-ip";
import { getPendingUploadForPreview, readPendingUploadFile } from "@/lib/upload-security";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const upload = await getPendingUploadForPreview(prisma, id, extractRequestIp(request.headers));

        if (!upload) {
            return new NextResponse("Not Found", { status: 404 });
        }

        const file = await readPendingUploadFile(upload.storageKey);
        return new NextResponse(file, {
            status: 200,
            headers: {
                "Content-Type": upload.mimeType,
                "Cache-Control": "private, max-age=60",
            },
        });
    } catch (error) {
        console.error("Pending upload preview error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
