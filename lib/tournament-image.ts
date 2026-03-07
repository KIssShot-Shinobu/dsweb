import { existsSync } from "fs";
import path from "path";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { getPermanentUploadTargets } from "@/lib/runtime-config";

export function resolveTournamentImage(image: string | null | undefined) {
    const normalizedPath = normalizeAssetUrl(image);

    if (!normalizedPath || !normalizedPath.startsWith("/uploads/")) {
        return null;
    }

    const relativePath = normalizedPath.slice("/uploads/".length);
    const candidates = getPermanentUploadTargets().map((targetDir) => path.join(targetDir, relativePath));

    return candidates.some((diskPath) => existsSync(diskPath)) ? normalizedPath : null;
}
