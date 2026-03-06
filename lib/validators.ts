import { z } from "zod";

// ─── Constants ────────────────────────────────────────────────────────────────
const IGN_REGEX = /^\[DS\].+/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

// ─── Register Schema ──────────────────────────────────────────────────────────
export const registerSchema = z.object({
    // Step 1 – Account
    fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
    email: z.string().email("Email tidak valid"),
    password: z
        .string()
        .min(8, "Password minimal 8 karakter")
        .regex(/[A-Za-z]/, "Password harus mengandung huruf")
        .regex(/[0-9]/, "Password harus mengandung angka"),
    confirmPassword: z.string(),
    phoneWhatsapp: z.string().regex(PHONE_REGEX, "Nomor WhatsApp tidak valid (contoh: +628123456789)"),
    city: z.string().min(2, "Kota harus diisi"),

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
    duelLinksScreenshot: z.string().optional(), // URL setelah upload
    masterDuelScreenshot: z.string().optional(),

    // Step 3 – Guild Info
    sourceInfo: z.string().min(1, "Sumber informasi harus diisi"),
    prevGuild: z.string().optional(),
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
);

// ─── Login Schema ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
    email: z.string().email("Email tidak valid"),
    password: z.string().min(1, "Password harus diisi"),
    rememberMe: z.boolean().optional(),
});

// ─── Approve / Reject Schema ──────────────────────────────────────────────────
export const approveSchema = z.object({
    status: z.enum(["ACTIVE", "REJECTED", "BANNED"]),
    reason: z.string().optional(),
    role: z.enum(["USER", "MEMBER", "OFFICER", "ADMIN", "FOUNDER"]).optional(),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;

// ─── Treasury Schema ──────────────────────────────────────────────────────────
export const treasurySchema = z.object({
    type: z.enum(["MASUK", "KELUAR"], { message: "Tipe transaksi wajib diisi" }),
    amount: z.coerce.number().min(1, "Nominal tidak boleh 0"),
    description: z.string().min(3, "Keterangan minimal 3 karakter"),
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
    title: z.string().min(3, "Judul turnamen minimal 3 karakter"),
    description: z.string().optional(),
    format: z.enum(["BO1", "BO3", "BO5"], { message: "Format tidak valid" }),
    gameType: z.enum(["DUEL_LINKS", "MASTER_DUEL"], { message: "Pilih game" }),
    status: z.enum(["OPEN", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
    entryFee: z.coerce.number().min(0, "Biaya masuk tidak boleh negatif"),
    prizePool: z.coerce.number().min(0, "Prize pool tidak boleh negatif"),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Tanggal tidak valid",
    }),
    image: z.string().optional(),
});

export type TournamentInput = z.infer<typeof tournamentSchema>;
