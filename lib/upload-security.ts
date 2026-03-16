import { promises as fs } from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";
import { getPermanentUploadTargets } from "@/lib/runtime-config";

const REGISTER_UPLOAD_LIMIT_PER_HOUR = 5;
const PENDING_UPLOAD_TTL_MS = 1000 * 60 * 60 * 24;

type SupportedMime = "image/png" | "image/jpeg" | "image/webp";

function getPendingUploadDir() {
    const configured = process.env.UPLOAD_TEMP_DIR?.trim();
    return configured || path.join(os.tmpdir(), "dsweb-public-uploads");
}

function getFileExtension(mimeType: SupportedMime) {
    switch (mimeType) {
        case "image/png":
            return "png";
        case "image/jpeg":
            return "jpg";
        case "image/webp":
            return "webp";
    }
}

function sniffMagicMime(buffer: Buffer): SupportedMime | null {
    if (buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a) {
        return "image/png";
    }

    if (buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff) {
        return "image/jpeg";
    }

    if (buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP") {
        return "image/webp";
    }

    return null;
}

async function ensureDirectory(dirPath: string) {
    await fs.mkdir(dirPath, { recursive: true });
}

async function moveFile(sourcePath: string, destinationPath: string) {
    try {
        await fs.rename(sourcePath, destinationPath);
    } catch {
        const file = await fs.readFile(sourcePath);
        await fs.writeFile(destinationPath, file);
        await fs.unlink(sourcePath).catch(() => undefined);
    }
}

function getPendingUploadPath(storageKey: string) {
    return path.join(getPendingUploadDir(), storageKey);
}

async function writePermanentUpload(storageKey: string) {
    const pendingFile = await fs.readFile(getPendingUploadPath(storageKey));
    const targetDirs = getPermanentUploadTargets();

    await Promise.all(
        targetDirs.map(async (targetDir) => {
            await ensureDirectory(targetDir);
            await fs.writeFile(path.join(targetDir, storageKey), pendingFile);
        })
    );

    await fs.unlink(getPendingUploadPath(storageKey)).catch(() => undefined);
    return `/uploads/${storageKey}`;
}

async function deletePendingFile(storageKey: string) {
    await fs.unlink(getPendingUploadPath(storageKey)).catch(() => undefined);
}

export async function cleanupExpiredPendingUploads(prisma: PrismaClient) {
    const expiredUploads = await prisma.pendingUpload.findMany({
        where: {
            status: "TEMP",
            expiresAt: { lt: new Date() },
        },
        select: {
            id: true,
            storageKey: true,
        },
    });

    if (expiredUploads.length === 0) {
        return;
    }

    await Promise.all(expiredUploads.map((upload) => deletePendingFile(upload.storageKey)));
    await prisma.pendingUpload.updateMany({
        where: { id: { in: expiredUploads.map((upload) => upload.id) } },
        data: { status: "EXPIRED" },
    });
}

export function validateImageUpload(buffer: Buffer, declaredMimeType: string) {
    const sniffedMimeType = sniffMagicMime(buffer);
    if (!sniffedMimeType) {
        throw new Error("File bukan gambar yang didukung");
    }

    if (declaredMimeType !== sniffedMimeType) {
        throw new Error("MIME type file tidak cocok dengan isi file");
    }

    return sniffedMimeType;
}

export async function enforcePublicUploadRateLimit(prisma: PrismaClient, ipAddress: string) {
    const windowStart = new Date(Date.now() - 1000 * 60 * 60);
    const requestCount = await prisma.pendingUpload.count({
        where: {
            ipAddress,
            createdAt: { gte: windowStart },
        },
    });

    if (requestCount >= REGISTER_UPLOAD_LIMIT_PER_HOUR) {
        throw new Error("Batas upload publik tercapai. Coba lagi dalam 1 jam.");
    }
}

export async function createPendingRegisterUpload(params: {
    prisma: PrismaClient;
    buffer: Buffer;
    originalName: string;
    declaredMimeType: string;
    ipAddress: string;
}) {
    await cleanupExpiredPendingUploads(params.prisma);
    await enforcePublicUploadRateLimit(params.prisma, params.ipAddress);

    const mimeType = validateImageUpload(params.buffer, params.declaredMimeType);
    const storageKey = `${crypto.randomUUID()}.${getFileExtension(mimeType)}`;
    const pendingUploadDir = getPendingUploadDir();

    await ensureDirectory(pendingUploadDir);
    await fs.writeFile(path.join(pendingUploadDir, storageKey), params.buffer);

    const upload = await params.prisma.pendingUpload.create({
        data: {
            purpose: "REGISTER_SCREENSHOT",
            storageKey,
            originalName: params.originalName.slice(0, 191),
            mimeType,
            size: params.buffer.byteLength,
            ipAddress: params.ipAddress,
            expiresAt: new Date(Date.now() + PENDING_UPLOAD_TTL_MS),
        },
        select: {
            id: true,
            storageKey: true,
            mimeType: true,
            size: true,
            expiresAt: true,
        },
    });

    return {
        ...upload,
        previewUrl: `/api/upload/public/${upload.id}`,
    };
}

export async function getPendingUploadForPreview(prisma: PrismaClient, uploadId: string, ipAddress: string) {
    await cleanupExpiredPendingUploads(prisma);

    const upload = await prisma.pendingUpload.findUnique({
        where: { id: uploadId },
        select: {
            id: true,
            storageKey: true,
            mimeType: true,
            ipAddress: true,
            status: true,
            expiresAt: true,
        },
    });

    if (!upload || upload.status !== "TEMP" || upload.expiresAt < new Date()) {
        return null;
    }

    if (upload.ipAddress !== ipAddress) {
        return null;
    }

    return upload;
}

export async function readPendingUploadFile(storageKey: string) {
    return fs.readFile(getPendingUploadPath(storageKey));
}

export async function assertClaimableRegisterUploads(params: {
    prisma: PrismaClient;
    ipAddress: string;
    uploadIds: string[];
}) {
    if (params.uploadIds.length === 0) return;

    await cleanupExpiredPendingUploads(params.prisma);

    const uploads = await params.prisma.pendingUpload.findMany({
        where: {
            id: { in: params.uploadIds },
            purpose: "REGISTER_SCREENSHOT",
            status: "TEMP",
        },
        select: {
            id: true,
            ipAddress: true,
            expiresAt: true,
        },
    });

    if (uploads.length !== params.uploadIds.length) {
        throw new Error("Sebagian upload screenshot tidak valid atau sudah kedaluwarsa");
    }

    const invalidUpload = uploads.find(
        (upload) => upload.ipAddress !== params.ipAddress || upload.expiresAt < new Date()
    );

    if (invalidUpload) {
        throw new Error("Screenshot upload tidak cocok dengan sesi registrasi saat ini");
    }
}

export async function claimRegisterUploads(params: {
    prisma: PrismaClient;
    userId: string;
    ipAddress: string;
    uploads: Partial<Record<string, string>>;
}) {
    const uploadIds = Object.values(params.uploads).filter((value): value is string => Boolean(value));
    if (uploadIds.length === 0) return;

    await assertClaimableRegisterUploads({
        prisma: params.prisma,
        ipAddress: params.ipAddress,
        uploadIds,
    });

    const pendingUploads = await params.prisma.pendingUpload.findMany({
        where: {
            id: { in: uploadIds },
            status: "TEMP",
        },
        select: {
            id: true,
            storageKey: true,
        },
    });

    for (const [gameCode, uploadId] of Object.entries(params.uploads) as Array<[string, string | undefined]>) {
        if (!uploadId) continue;

        const pendingUpload = pendingUploads.find((upload) => upload.id === uploadId);
        if (!pendingUpload) {
            throw new Error(`Upload ${uploadId} tidak ditemukan saat proses claim`);
        }

        const permanentUrl = await writePermanentUpload(pendingUpload.storageKey);

        const game = await params.prisma.game.findFirst({
            where: { code: gameCode },
            select: { id: true },
        });
        if (!game) {
            throw new Error(`Game ${gameCode} tidak ditemukan`);
        }

        await params.prisma.playerGameAccount.updateMany({
            where: {
                userId: params.userId,
                gameId: game.id,
            },
            data: {
                screenshotUrl: permanentUrl,
            },
        });

        await params.prisma.pendingUpload.update({
            where: { id: uploadId },
            data: {
                status: "CLAIMED",
                claimedByUserId: params.userId,
                claimedAt: new Date(),
            },
        });
    }
}
