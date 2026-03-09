import { existsSync, promises as fs } from "fs";
import path from "path";
import { getPermanentUploadTargets } from "@/lib/runtime-config";

const MIME_TYPES: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
};

export function sanitizeUploadSegments(segments: string[]) {
    const cleaned = segments.filter(Boolean);
    if (cleaned.length === 0) {
        return null;
    }

    for (const segment of cleaned) {
        if (segment.includes("..") || path.isAbsolute(segment)) {
            return null;
        }
    }

    return cleaned;
}

export function resolveUploadFile(segments: string[]) {
    const safeSegments = sanitizeUploadSegments(segments);
    if (!safeSegments) {
        return null;
    }

    const candidates = getPermanentUploadTargets().map((targetDir) => path.join(targetDir, ...safeSegments));
    const filePath = candidates.find((candidate) => existsSync(candidate));
    if (!filePath) {
        return null;
    }

    const extension = path.extname(filePath).toLowerCase();
    return {
        filePath,
        mimeType: MIME_TYPES[extension] || "application/octet-stream",
    };
}

export function getUploadSegmentsFromUrl(url: string | null | undefined) {
    if (!url || !url.startsWith("/uploads/")) {
        return null;
    }

    return sanitizeUploadSegments(url.replace(/^\/uploads\//, "").split("/"));
}

export async function deleteUploadFileByUrl(url: string | null | undefined) {
    const safeSegments = getUploadSegmentsFromUrl(url);
    if (!safeSegments) {
        return;
    }

    await Promise.allSettled(
        getPermanentUploadTargets().map(async (targetDir) => {
            const filePath = path.join(targetDir, ...safeSegments);
            try {
                await fs.unlink(filePath);
            } catch {
                // Ignore missing mirrored upload files.
            }
        })
    );
}
