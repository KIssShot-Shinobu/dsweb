import { existsSync } from "fs";
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
