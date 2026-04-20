export function normalizeAssetUrl(url: string | null | undefined) {
    if (!url) return null;

    if (url.startsWith("/")) {
        return url;
    }

    try {
        new URL(url);
        return url;
    } catch {
        return url;
    }
}
