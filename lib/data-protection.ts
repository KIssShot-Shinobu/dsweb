import crypto from "crypto";

const ENCRYPTION_PREFIX = "enc:v1";
const SENSITIVE_FIELDS = ["phoneWhatsapp", "accountNumber", "twoFactorSecret"] as const;
const LOOKUP_HASH_FIELDS = {
    phoneWhatsapp: "phoneWhatsappHash",
    accountNumber: "accountNumberHash",
} as const;

type SensitiveField = (typeof SENSITIVE_FIELDS)[number];
type UserRecordLike = Record<string, unknown> | null | undefined;

function getEncryptionKey() {
    const rawKey = process.env.DATA_ENCRYPTION_KEY;
    if (!rawKey) {
        throw new Error("DATA_ENCRYPTION_KEY must be set for sensitive field protection.");
    }

    return crypto.createHash("sha256").update(rawKey).digest();
}

function normalizeLookupValue(value: string) {
    return value.trim().toLowerCase();
}

export function hashLookupValue(value: string) {
    return crypto
        .createHmac("sha256", getEncryptionKey())
        .update(normalizeLookupValue(value))
        .digest("hex");
}

export function isEncryptedValue(value: unknown): value is string {
    return typeof value === "string" && value.startsWith(`${ENCRYPTION_PREFIX}:`);
}

export function encryptValue(value: string) {
    if (!value) return value;
    if (isEncryptedValue(value)) return value;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
        ENCRYPTION_PREFIX,
        iv.toString("base64url"),
        authTag.toString("base64url"),
        encrypted.toString("base64url"),
    ].join(":");
}

export function decryptValue(value: string) {
    if (!isEncryptedValue(value)) return value;

    const [, , ivBase64, authTagBase64, encryptedBase64] = value.split(":");
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(ivBase64, "base64url")
    );
    decipher.setAuthTag(Buffer.from(authTagBase64, "base64url"));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedBase64, "base64url")),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}

function rewriteLookupFilters(input: unknown): unknown {
    if (!input || typeof input !== "object" || input instanceof Date) {
        return input;
    }

    if (Array.isArray(input)) {
        return input.map(rewriteLookupFilters);
    }

    const rewritten: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
        if (key in LOOKUP_HASH_FIELDS && typeof value === "string") {
            rewritten[LOOKUP_HASH_FIELDS[key as keyof typeof LOOKUP_HASH_FIELDS]] = hashLookupValue(value);
            continue;
        }

        rewritten[key] = rewriteLookupFilters(value);
    }

    return rewritten;
}

export function protectUserWriteData(data: Record<string, unknown>) {
    const next: Record<string, unknown> = { ...data };

    for (const field of SENSITIVE_FIELDS) {
        const rawValue = next[field];
        if (typeof rawValue === "string" && rawValue.trim()) {
            next[field] = encryptValue(rawValue.trim());
        } else if (rawValue === null) {
            next[field] = null;
        }
    }

    if ("phoneWhatsapp" in next) {
        const rawPhone = data.phoneWhatsapp;
        next.phoneWhatsappHash =
            typeof rawPhone === "string" && rawPhone.trim()
                ? hashLookupValue(rawPhone)
                : null;
    }

    if ("accountNumber" in next) {
        const rawAccountNumber = data.accountNumber;
        next.accountNumberHash =
            typeof rawAccountNumber === "string" && rawAccountNumber.trim()
                ? hashLookupValue(rawAccountNumber)
                : null;
    }

    return next;
}

export function protectUserWhereInput<T>(where: T): T {
    return rewriteLookupFilters(where) as T;
}

export function unprotectUserRecord<T>(record: T): T {
    if (!record || typeof record !== "object") {
        return record;
    }

    if (Array.isArray(record)) {
        return record.map((item) => unprotectUserRecord(item)) as T;
    }

    const next = { ...(record as Record<string, unknown>) };

    for (const field of SENSITIVE_FIELDS) {
        const rawValue = next[field];
        if (typeof rawValue === "string" && rawValue) {
            try {
                next[field] = decryptValue(rawValue);
            } catch {
                next[field] = rawValue;
            }
        }
    }

    return next as T;
}

export function getChangedSensitiveFields(before: UserRecordLike, after: UserRecordLike) {
    if (!after || typeof after !== "object") return [];

    return SENSITIVE_FIELDS.filter((field) => {
        const previousValue = before && typeof before === "object" ? before[field] : undefined;
        const nextValue = after[field];
        return previousValue !== nextValue;
    });
}

export function redactSensitiveFields<T extends Record<string, unknown>>(value: T): T {
    const next: Record<string, unknown> = { ...value };

    for (const field of SENSITIVE_FIELDS) {
        if (field in next && next[field] != null) {
            next[field] = "[REDACTED]";
        }
    }

    if ("phoneWhatsappHash" in next && next.phoneWhatsappHash != null) {
        next.phoneWhatsappHash = "[REDACTED]";
    }

    if ("accountNumberHash" in next && next.accountNumberHash != null) {
        next.accountNumberHash = "[REDACTED]";
    }

    return next as T;
}
