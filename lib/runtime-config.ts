const DEFAULT_LOCAL_APP_URL = "http://localhost:3000";
const DEFAULT_UPLOAD_DIR = "./public/uploads";
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

export function getUploadDir() {
    return process.env.UPLOAD_DIR?.trim() || DEFAULT_UPLOAD_DIR;
}

export function getMaxFileSize() {
    const parsed = Number.parseInt(process.env.MAX_FILE_SIZE || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FILE_SIZE;
}
