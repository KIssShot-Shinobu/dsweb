import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
    getR2AccessKeyId,
    getR2Bucket,
    getR2Endpoint,
    getR2PublicBaseUrl,
    getR2SecretAccessKey,
    isR2Enabled,
} from "@/lib/runtime-config";

let r2Client: S3Client | null = null;

function getR2Client() {
    if (r2Client) return r2Client;

    r2Client = new S3Client({
        region: "auto",
        endpoint: getR2Endpoint(),
        forcePathStyle: true,
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
        credentials: {
            accessKeyId: getR2AccessKeyId(),
            secretAccessKey: getR2SecretAccessKey(),
        },
    });

    return r2Client;
}

export function ensureR2Enabled() {
    if (!isR2Enabled()) {
        throw new Error("R2 is disabled");
    }
}

export function buildR2PublicUrl(key: string) {
    const safeKey = key.replace(/^\/+/, "");
    return `${getR2PublicBaseUrl()}/${safeKey}`;
}

export async function putR2Object(params: {
    key: string;
    body: Buffer;
    contentType: string;
}) {
    ensureR2Enabled();
    await getR2Client().send(
        new PutObjectCommand({
            Bucket: getR2Bucket(),
            Key: params.key.replace(/^\/+/, ""),
            Body: params.body,
            ContentType: params.contentType,
        })
    );
}

export async function deleteR2Object(key: string) {
    ensureR2Enabled();
    await getR2Client().send(
        new DeleteObjectCommand({
            Bucket: getR2Bucket(),
            Key: key.replace(/^\/+/, ""),
        })
    );
}
