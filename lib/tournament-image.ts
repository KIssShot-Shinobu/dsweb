import { existsSync } from "fs";
import path from "path";
import { normalizeAssetUrl } from "@/lib/asset-url";

export function resolveTournamentImage(image: string | null | undefined) {
    const normalizedPath = normalizeAssetUrl(image);

    if (!normalizedPath || !normalizedPath.startsWith("/uploads/")) {
        return null;
    }

    const diskPath = path.join(process.cwd(), "public", normalizedPath.slice(1));

    return existsSync(diskPath) ? normalizedPath : null;
}
