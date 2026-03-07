export function normalizeAssetUrl(url: string | null | undefined) {
    if (!url) return null;

    if (url.startsWith("/")) {
        return url;
    }

    try {
        const parsed = new URL(url);
        if (parsed.pathname.startsWith("/uploads/")) {
            return parsed.pathname;
        }
        return url;
    } catch {
        return url;
    }
}
