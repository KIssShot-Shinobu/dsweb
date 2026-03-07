import { z } from "zod";

// ─── Constants ────────────────────────────────────────────────────────────────
const IGN_REGEX = /^\[DS\].+/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const SAFE_TEXT_REGEX = /^[\p{L}\p{N}\s'.,()\-_/]+$/u;
const LOCAL_UPLOAD_PATH_REGEX = /^\/uploads\/[A-Za-z0-9._/-]+$/;

// ─── Register Schema ──────────────────────────────────────────────────────────
export const registerSchema = z.object({
    // Step 1 – Account
    fullName: z.string().trim().min(3, "Nama lengkap minimal 3 karakter").max(191, "Nama terlalu panjang"),
    email: z.string().trim().toLowerCase().email("Email tidak valid"),
    password: z
        .string()
        .min(8, "Password minimal 8 karakter")
        .regex(/[A-Za-z]/, "Password harus mengandung huruf")
        .regex(/[0-9]/, "Password harus mengandung angka"),
    confirmPassword: z.string(),
    phoneWhatsapp: z.string().trim().regex(PHONE_REGEX, "Nomor WhatsApp tidak valid (contoh: +628123456789)"),
    city: z.string().trim().min(2, "Kota harus diisi").max(191, "Nama kota terlalu panjang"),

    // Step 2 – Game Profile (at least one game required)
    duelLinksGameId: z.string().optional(),
    duelLinksIgn: z
        .string()
        .regex(IGN_REGEX, "IGN Duel Links wajib diawali [DS]")
        .optional()
        .or(z.literal("")),
    masterDuelGameId: z.string().optional(),
    masterDuelIgn: z
        .string()
        .regex(IGN_REGEX, "IGN Master Duel wajib diawali [DS]")
        .optional()
        .or(z.literal("")),
    duelLinksScreenshotUploadId: z.string().cuid("Upload screenshot Duel Links tidak valid").optional().or(z.literal("")),
    masterDuelScreenshotUploadId: z.string().cuid("Upload screenshot Master Duel tidak valid").optional().or(z.literal("")),

    // Step 3 – Guild Info
    sourceInfo: z.string().trim().min(1, "Sumber informasi harus diisi").max(191, "Sumber informasi terlalu panjang"),
    prevGuild: z.string().trim().max(191, "Nama guild terlalu panjang").optional(),
    guildStatus: z.enum(["SOLO_PLAYER", "LEFT_GUILD", "NEW_PLAYER"] as const, {
        message: "Pilih status guild",
    }),
    socialMedia: z.array(z.string()).min(1, "Pilih minimal 1 sosial media"),

    // Step 4 – Agreement
    agreement: z.literal(true, {
        message: "Anda harus menyetujui pernyataan",
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
}).refine(
    (data) => (data.duelLinksGameId && data.duelLinksIgn) || (data.masterDuelGameId && data.masterDuelIgn),
    {
        message: "Minimal satu game profile wajib diisi (Game ID + IGN)",
        path: ["duelLinksGameId"],
    }
).refine(
    (data) => !data.duelLinksScreenshotUploadId || Boolean(data.duelLinksGameId && data.duelLinksIgn),
    {
        message: "Screenshot Duel Links hanya bisa dipakai jika profile Duel Links diisi",
        path: ["duelLinksScreenshotUploadId"],
    }
).refine(
    (data) => !data.masterDuelScreenshotUploadId || Boolean(data.masterDuelGameId && data.masterDuelIgn),
    {
        message: "Screenshot Master Duel hanya bisa dipakai jika profile Master Duel diisi",
        path: ["masterDuelScreenshotUploadId"],
    }
);

// ─── Login Schema ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email("Email tidak valid"),
    password: z.string().min(1, "Password harus diisi"),
    rememberMe: z.boolean().optional(),
});

export const passwordChangeSchema = z
    .object({
        currentPassword: z.string().min(1, "Password saat ini harus diisi"),
        newPassword: z
            .string()
            .min(8, "Password baru minimal 8 karakter")
            .regex(/[A-Za-z]/, "Password baru harus mengandung huruf")
            .regex(/[0-9]/, "Password baru harus mengandung angka"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Konfirmasi password tidak cocok",
        path: ["confirmPassword"],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: "Password baru harus berbeda dari password saat ini",
        path: ["newPassword"],
    });

// ─── Approve / Reject Schema ──────────────────────────────────────────────────
export const approveSchema = z.object({
    status: z.enum(["ACTIVE", "BANNED"]),
    reason: z.string().optional(),
    role: z.enum(["USER", "MEMBER", "OFFICER", "ADMIN", "FOUNDER"]).optional(),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;

// ─── Treasury Schema ──────────────────────────────────────────────────────────
export const treasurySchema = z.object({
    type: z.enum(["MASUK", "KELUAR"], { message: "Tipe transaksi wajib diisi" }),
    amount: z.coerce.number().min(1, "Nominal tidak boleh 0"),
    description: z.string().trim().min(3, "Keterangan minimal 3 karakter").max(191, "Keterangan terlalu panjang").regex(SAFE_TEXT_REGEX, "Keterangan mengandung karakter yang tidak diizinkan"),
    userId: z.string().cuid("User ID tidak valid").optional().nullable(),
});

export type TreasuryInput = z.infer<typeof treasurySchema>;

// ─── Game Profile Update Schema ───────────────────────────────────────────────
export const updateGameProfileSchema = z.object({
    gameType: z.enum(["DUEL_LINKS", "MASTER_DUEL"]),
    ign: z.string().min(1, "IGN tidak boleh kosong"),
    gameId: z.string().min(1, "Game ID / Friend ID tidak boleh kosong"),
});

export type UpdateGameProfileInput = z.infer<typeof updateGameProfileSchema>;

// ─── Tournament Schema ────────────────────────────────────────────────────────
export const tournamentSchema = z.object({
    title: z.string().trim().min(3, "Judul turnamen minimal 3 karakter").max(191, "Judul turnamen terlalu panjang"),
    description: z.string().trim().max(1000, "Deskripsi terlalu panjang").optional().or(z.literal("")),
    format: z.enum(["BO1", "BO3", "BO5"], { message: "Format tidak valid" }),
    gameType: z.enum(["DUEL_LINKS", "MASTER_DUEL"], { message: "Pilih game" }),
    status: z.enum(["OPEN", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
    entryFee: z.coerce.number().min(0, "Biaya masuk tidak boleh negatif"),
    prizePool: z.coerce.number().min(0, "Prize pool tidak boleh negatif"),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Tanggal tidak valid",
    }),
    image: z
        .string()
        .regex(LOCAL_UPLOAD_PATH_REGEX, "Gunakan gambar hasil upload lokal")
        .optional()
        .or(z.literal("")),
});

export type TournamentInput = z.infer<typeof tournamentSchema>;
export const tournamentUpdateSchema = tournamentSchema.partial();
export type TournamentUpdateInput = z.infer<typeof tournamentUpdateSchema>;
