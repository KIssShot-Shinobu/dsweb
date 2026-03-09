import { z } from "zod";

const IGN_REGEX = /^[A-Za-z0-9 _.\-\[\]()]{2,32}$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const SAFE_TEXT_REGEX = /^[\p{L}\p{N}\s'.,()\-_/]+$/u;
const LOCAL_UPLOAD_PATH_REGEX = /^\/uploads\/[A-Za-z0-9._/-]+$/;
const TEAM_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,24}$/;

export const USER_STATUS_VALUES = ["ACTIVE", "BANNED"] as const;
export const USER_ROLE_VALUES = ["USER", "MEMBER", "OFFICER", "ADMIN", "FOUNDER"] as const;
export const TOURNAMENT_STATUS_VALUES = ["OPEN", "ONGOING", "COMPLETED", "CANCELLED"] as const;
export const TOURNAMENT_FORMAT_VALUES = ["BO1", "BO3", "BO5"] as const;
export const GAME_TYPE_VALUES = ["DUEL_LINKS", "MASTER_DUEL"] as const;

export const registerSchema = z
    .object({
        username: z
            .string()
            .trim()
            .min(3, "Username minimal 3 karakter")
            .max(24, "Username maksimal 24 karakter")
            .regex(USERNAME_REGEX, "Username hanya boleh huruf, angka, titik, underscore, dan strip")
            .transform((value) => value.toLowerCase()),
        email: z.string().trim().toLowerCase().email("Email tidak valid"),
        password: z
            .string()
            .min(8, "Password minimal 8 karakter")
            .regex(/[A-Za-z]/, "Password harus mengandung huruf")
            .regex(/[0-9]/, "Password harus mengandung angka"),
        confirmPassword: z.string(),
        phoneWhatsapp: z.string().trim().regex(PHONE_REGEX, "Nomor WhatsApp tidak valid (contoh: +628123456789)"),
        city: z.string().trim().min(2, "Kota harus diisi").max(191, "Nama kota terlalu panjang"),
        duelLinksGameId: z.string().optional(),
        duelLinksIgn: z.string().min(2, "IGN Duel Links minimal 2 karakter").regex(IGN_REGEX, "IGN Duel Links mengandung karakter yang tidak valid").optional().or(z.literal("")),
        masterDuelGameId: z.string().optional(),
        masterDuelIgn: z.string().min(2, "IGN Master Duel minimal 2 karakter").regex(IGN_REGEX, "IGN Master Duel mengandung karakter yang tidak valid").optional().or(z.literal("")),
        duelLinksScreenshotUploadId: z.string().cuid("Upload screenshot Duel Links tidak valid").optional().or(z.literal("")),
        masterDuelScreenshotUploadId: z.string().cuid("Upload screenshot Master Duel tidak valid").optional().or(z.literal("")),
        sourceInfo: z.string().trim().min(1, "Sumber informasi harus diisi").max(191, "Sumber informasi terlalu panjang"),
        socialMedia: z.array(z.string()).min(1, "Pilih minimal 1 sosial media"),
        agreement: z.literal(true, { message: "Anda harus menyetujui pernyataan" }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Konfirmasi password tidak cocok",
        path: ["confirmPassword"],
    })
    .refine((data) => (data.duelLinksGameId && data.duelLinksIgn) || (data.masterDuelGameId && data.masterDuelIgn), {
        message: "Minimal satu game profile wajib diisi (Game ID + IGN)",
        path: ["duelLinksGameId"],
    })
    .refine((data) => !data.duelLinksScreenshotUploadId || Boolean(data.duelLinksGameId && data.duelLinksIgn), {
        message: "Screenshot Duel Links hanya bisa dipakai jika profile Duel Links diisi",
        path: ["duelLinksScreenshotUploadId"],
    })
    .refine((data) => !data.masterDuelScreenshotUploadId || Boolean(data.masterDuelGameId && data.masterDuelIgn), {
        message: "Screenshot Master Duel hanya bisa dipakai jika profile Master Duel diisi",
        path: ["masterDuelScreenshotUploadId"],
    });

export const loginSchema = z.object({
    identifier: z.string().trim().min(3, "Masukkan username atau email yang valid"),
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

export const approveSchema = z.object({
    status: z.enum(USER_STATUS_VALUES),
    reason: z.string().trim().max(500, "Alasan terlalu panjang").optional().or(z.literal("")),
    role: z.enum(USER_ROLE_VALUES).optional(),
    teamId: z.string().cuid("Team ID tidak valid").nullable().optional(),
});

export const teamSchema = z.object({
    name: z.string().trim().min(2, "Nama team minimal 2 karakter").max(191, "Nama team terlalu panjang"),
    slug: z
        .string()
        .trim()
        .toLowerCase()
        .min(2, "Slug team minimal 2 karakter")
        .max(191, "Slug team terlalu panjang")
        .regex(TEAM_SLUG_REGEX, "Slug hanya boleh huruf kecil, angka, dan strip"),
    description: z.string().trim().max(500, "Deskripsi team terlalu panjang").optional().or(z.literal("")),
    logoUrl: z.string().regex(LOCAL_UPLOAD_PATH_REGEX, "Gunakan logo hasil upload lokal").optional().or(z.literal("")),
    isActive: z.boolean().optional(),
});

export const teamRosterAssignmentSchema = z.object({
    userId: z.string().cuid("User ID tidak valid"),
});

export const usersQuerySchema = z.object({
    status: z.enum(["ALL", ...USER_STATUS_VALUES] as const).optional(),
    role: z.enum(["ALL", ...USER_ROLE_VALUES] as const).optional(),
    teamId: z.union([z.literal("ALL"), z.literal("NO_TEAM"), z.string().cuid()]).optional(),
    search: z.string().trim().max(191).optional(),
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
});

export const teamsQuerySchema = z.object({
    search: z.string().trim().max(191).optional(),
    status: z.enum(["ALL", "ACTIVE", "INACTIVE"] as const).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type TeamRosterAssignmentInput = z.infer<typeof teamRosterAssignmentSchema>;
export type UsersQueryInput = z.infer<typeof usersQuerySchema>;
export type TeamsQueryInput = z.infer<typeof teamsQuerySchema>;

export const treasurySchema = z.object({
    type: z.enum(["MASUK", "KELUAR"], { message: "Tipe transaksi wajib diisi" }),
    amount: z.coerce.number().min(1, "Nominal tidak boleh 0"),
    description: z
        .string()
        .trim()
        .min(3, "Keterangan minimal 3 karakter")
        .max(191, "Keterangan terlalu panjang")
        .regex(SAFE_TEXT_REGEX, "Keterangan mengandung karakter yang tidak diizinkan"),
    userId: z.string().cuid("User ID tidak valid").optional().nullable(),
});

export type TreasuryInput = z.infer<typeof treasurySchema>;

export const updateGameProfileSchema = z.object({
    gameType: z.enum(GAME_TYPE_VALUES),
    ign: z.string().min(1, "IGN tidak boleh kosong"),
    gameId: z.string().min(1, "Game ID / Friend ID tidak boleh kosong"),
});

export type UpdateGameProfileInput = z.infer<typeof updateGameProfileSchema>;

export const profileAvatarSchema = z.object({
    avatarUrl: z.union([z.string().regex(LOCAL_UPLOAD_PATH_REGEX, "Gunakan gambar hasil upload lokal"), z.null()]),
});

export type ProfileAvatarInput = z.infer<typeof profileAvatarSchema>;

export const tournamentSchema = z.object({
    title: z.string().trim().min(3, "Judul turnamen minimal 3 karakter").max(191, "Judul turnamen terlalu panjang"),
    description: z.string().trim().max(1000, "Deskripsi terlalu panjang").optional().or(z.literal("")),
    format: z.enum(TOURNAMENT_FORMAT_VALUES, { message: "Format tidak valid" }),
    gameType: z.enum(GAME_TYPE_VALUES, { message: "Pilih game" }),
    status: z.enum(TOURNAMENT_STATUS_VALUES).optional(),
    entryFee: z.coerce.number().min(0, "Biaya masuk tidak boleh negatif"),
    prizePool: z.coerce.number().min(0, "Prize pool tidak boleh negatif"),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Tanggal tidak valid" }),
    image: z.string().regex(LOCAL_UPLOAD_PATH_REGEX, "Gunakan gambar hasil upload lokal").optional().or(z.literal("")),
});

export type TournamentInput = z.infer<typeof tournamentSchema>;
export const tournamentUpdateSchema = tournamentSchema.partial();
export type TournamentUpdateInput = z.infer<typeof tournamentUpdateSchema>;

