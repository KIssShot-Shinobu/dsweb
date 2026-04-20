import { existsSync, promises as fs } from "fs";
import path from "path";
import { deleteR2Object } from "@/lib/r2-storage";
import {
    getAppUrl,
    getPermanentUploadTargets,
    getR2PublicBaseUrl,
    isR2Enabled,
} from "@/lib/runtime-config";

const MIME_TYPES: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
};

type UploadLocation =
    | { kind: "local"; segments: string[] }
    | { kind: "r2"; segments: string[]; key: string };

function getOriginSafe(url: string) {
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

function getAllowedUploadOrigins() {
    const allowedOrigins = new Set<string>();
    const appOrigin = getOriginSafe(getAppUrl());
    if (appOrigin) {
        allowedOrigins.add(appOrigin);
    }

    if (isR2Enabled()) {
        const r2Origin = getOriginSafe(getR2PublicBaseUrl());
        if (r2Origin) {
            allowedOrigins.add(r2Origin);
        }
    }

    return allowedOrigins;
}

function getUploadSegmentsFromPathname(pathname: string) {
    if (!pathname.startsWith("/uploads/")) {
        return null;
    }

    return sanitizeUploadSegments(pathname.replace(/^\/uploads\//, "").split("/"));
}

function getUploadSegmentsFromAbsoluteUrl(url: URL, baseUrl: string) {
    try {
        const basePath = new URL(baseUrl).pathname.replace(/\/+$/, "");
        const normalizedPath = basePath && url.pathname.startsWith(basePath)
            ? url.pathname.slice(basePath.length) || "/"
            : url.pathname;
        return getUploadSegmentsFromPathname(normalizedPath);
    } catch {
        return getUploadSegmentsFromPathname(url.pathname);
    }
}

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

export function resolveUploadLocationFromUrl(url: string | null | undefined): UploadLocation | null {
    if (!url) {
        return null;
    }

    if (url.startsWith("/")) {
        const segments = getUploadSegmentsFromPathname(url);
        return segments ? { kind: "local", segments } : null;
    }

    try {
        const parsed = new URL(url);
        const allowedOrigins = getAllowedUploadOrigins();
        if (!allowedOrigins.has(parsed.origin)) {
            return null;
        }

        if (isR2Enabled()) {
            const r2BaseUrl = getR2PublicBaseUrl();
            const r2Origin = getOriginSafe(getR2PublicBaseUrl());
            if (r2Origin && parsed.origin === r2Origin) {
                const segments = getUploadSegmentsFromAbsoluteUrl(parsed, r2BaseUrl);
                if (!segments) {
                    return null;
                }
                return {
                    kind: "r2",
                    segments,
                    key: `uploads/${segments.join("/")}`,
                };
            }
        }

        const segments = getUploadSegmentsFromAbsoluteUrl(parsed, getAppUrl());
        if (!segments) {
            return null;
        }

        return { kind: "local", segments };
    } catch {
        return null;
    }
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
    const location = resolveUploadLocationFromUrl(url);
    return location?.segments ?? null;
}

export function getUploadObjectKeyFromUrl(url: string | null | undefined) {
    const location = resolveUploadLocationFromUrl(url);
    if (!location) {
        return null;
    }

    if (location.kind === "r2") {
        return location.key;
    }

    return `uploads/${location.segments.join("/")}`;
}

export async function deleteUploadFileByUrl(url: string | null | undefined) {
    const location = resolveUploadLocationFromUrl(url);
    if (!location) {
        return;
    }

    if (location.kind === "r2") {
        try {
            await deleteR2Object(location.key);
        } catch {
            // Best-effort delete for object storage.
        }
        return;
    }

    await Promise.allSettled(
        getPermanentUploadTargets().map(async (targetDir) => {
            const filePath = path.join(targetDir, ...location.segments);
            try {
                await fs.unlink(filePath);
            } catch {
                // Ignore missing mirrored upload files.
            }
        })
    );
}
