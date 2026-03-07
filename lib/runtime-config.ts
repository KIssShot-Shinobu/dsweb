import path from "path";

const DEFAULT_LOCAL_APP_URL = "http://localhost:3000";
const DEFAULT_UPLOAD_DIR = path.join("public", "uploads");
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

export function getAppUrl() {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configuredUrl) {
        return configuredUrl.replace(/\/+$/, "");
    }

    if (process.env.NODE_ENV !== "production") {
        return DEFAULT_LOCAL_APP_URL;
    }

    throw new Error("NEXT_PUBLIC_APP_URL is required in production");
}

export function getProjectRoot() {
    return path.resolve(process.env.APP_ROOT?.trim() || process.cwd());
}

export function getUploadDir() {
    const configured = process.env.UPLOAD_DIR?.trim();
    return path.resolve(getProjectRoot(), configured || DEFAULT_UPLOAD_DIR);
}

export function getStandaloneUploadDir() {
    return path.join(getProjectRoot(), ".next", "standalone", "public", "uploads");
}

export function getPermanentUploadTargets() {
    return Array.from(new Set([getUploadDir(), getStandaloneUploadDir()]));
}

export function getMaxFileSize() {
    const parsed = Number.parseInt(process.env.MAX_FILE_SIZE || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FILE_SIZE;
}
