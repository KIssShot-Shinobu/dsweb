import path from "path";

const DEFAULT_LOCAL_APP_URL = "http://localhost:3000";
const DEFAULT_UPLOAD_DIR = path.join("public", "uploads");
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_REGION_CACHE_DIR = path.join("data", "regions-cache");
const DEFAULT_REGION_CACHE_TTL_HOURS = 24 * 30;
const DEFAULT_EMSIFA_API_BASE_URL = "https://www.emsifa.com/api-wilayah-indonesia/api";

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

export function getRegionCacheDir() {
    const configured = process.env.REGION_CACHE_DIR?.trim();
    return path.resolve(getProjectRoot(), configured || DEFAULT_REGION_CACHE_DIR);
}

export function getRegionCacheTtlHours() {
    const parsed = Number.parseInt(process.env.REGION_CACHE_TTL_HOURS || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REGION_CACHE_TTL_HOURS;
}

export function getEmsifaApiBaseUrl() {
    return (process.env.EMSIFA_API_BASE_URL?.trim() || DEFAULT_EMSIFA_API_BASE_URL).replace(/\/+$/, "");
}
