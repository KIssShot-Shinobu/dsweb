import { z } from "zod";
import { formatGameId, isFormattedGameId, normalizeGameIdDigits } from "@/lib/game-id";
import { parseLocalDateTime } from "@/lib/datetime";

const IGN_REGEX = /^[A-Za-z0-9 _.\-\[\]()]{2,32}$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const SAFE_TEXT_REGEX = /^[\p{L}\p{N}\s'.,()\-_/]+$/u;
const LOCAL_UPLOAD_PATH_REGEX = /^\/uploads\/[A-Za-z0-9._/-]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,24}$/;

const gameIdFieldSchema = z
    .string()
    .trim()
    .transform((value) => formatGameId(value))
    .refine((value) => value === "" || isFormattedGameId(value), "Game ID harus terdiri dari 9 angka dengan format XXX-XXX-XXX");

export const USER_STATUS_VALUES = ["ACTIVE", "BANNED"] as const;
export const USER_ROLE_VALUES = ["USER", "MEMBER", "OFFICER", "ADMIN", "FOUNDER"] as const;
export const TEAM_ROLE_VALUES = ["CAPTAIN", "VICE_CAPTAIN", "PLAYER", "COACH", "MANAGER"] as const;
export const TEAM_INVITE_STATUS_VALUES = ["PENDING", "ACCEPTED", "DECLINED"] as const;
export const TEAM_REQUEST_STATUS_VALUES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const TOURNAMENT_STATUS_VALUES = ["OPEN", "ONGOING", "COMPLETED", "CANCELLED"] as const;
export const TOURNAMENT_STRUCTURE_VALUES = ["SINGLE_ELIM", "DOUBLE_ELIM", "SWISS"] as const;
export const TOURNAMENT_FORMAT_VALUES = ["BO1", "BO3", "BO5"] as const;
export const TOURNAMENT_MODE_VALUES = ["INDIVIDUAL", "TEAM_BOARD", "TEAM_KOTH"] as const;
export const TOURNAMENT_STAFF_ROLE_VALUES = ["REFEREE", "STAFF"] as const;
export const TOURNAMENT_MAX_PLAYERS_VALUES = [8, 16, 32, 64, 128, 256] as const;
export const TOURNAMENT_PAYMENT_STATUS_VALUES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export const MATCH_STATUS_VALUES = ["PENDING", "READY", "ONGOING", "RESULT_SUBMITTED", "CONFIRMED", "DISPUTED", "COMPLETED"] as const;

export const registerSchema = z
    .object({
        fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(191, "Nama terlalu panjang"),
        email: z.string().trim().toLowerCase().email("Email tidak valid"),
        password: z
            .string()
            .min(8, "Password minimal 8 karakter")
            .regex(/[A-Za-z]/, "Password harus mengandung huruf")
            .regex(/[0-9]/, "Password harus mengandung angka"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Konfirmasi password tidak cocok",
        path: ["confirmPassword"],
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
});

export const teamSchema = z.object({
    name: z.string().trim().min(2, "Nama team minimal 2 karakter").max(191, "Nama team terlalu panjang"),
    description: z.string().trim().max(500, "Deskripsi team terlalu panjang").optional().or(z.literal("")),
    logoUrl: z.string().regex(LOCAL_UPLOAD_PATH_REGEX, "Gunakan logo hasil upload lokal").optional().or(z.literal("")),
    isActive: z.boolean().optional(),
});

export const teamRosterAssignmentSchema = z.object({
    userId: z.string().cuid("User ID tidak valid"),
});

export const teamRosterAdminAssignSchema = z.object({
    teamId: z.string().cuid("Team ID tidak valid"),
    userId: z.string().cuid("User ID tidak valid"),
    role: z.enum(TEAM_ROLE_VALUES).optional(),
}).refine((data) => data.role !== "CAPTAIN", {
    message: "Gunakan transfer captain untuk menentukan captain",
    path: ["role"],
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

export const notificationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const tournamentParticipantsQuerySchema = z.object({
    search: z.string().trim().max(191).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

const tournamentParticipantGameIdSchema = z
    .string()
    .trim()
    .min(2, "In-game name minimal 2 karakter")
    .max(64, "In-game name terlalu panjang")
    .regex(SAFE_TEXT_REGEX, "In-game name mengandung karakter yang tidak valid");

export const tournamentParticipantUpdateSchema = z.object({
    gameId: tournamentParticipantGameIdSchema,
});

export const tournamentParticipantAddSchema = z
    .object({
        userId: z.string().cuid("User ID tidak valid").optional(),
        guestName: z
            .string()
            .trim()
            .min(2, "Nama peserta minimal 2 karakter")
            .max(191, "Nama peserta terlalu panjang")
            .regex(SAFE_TEXT_REGEX, "Nama peserta mengandung karakter yang tidak valid")
            .optional(),
        gameId: tournamentParticipantGameIdSchema,
    })
    .refine((data) => Boolean(data.userId) || Boolean(data.guestName), {
        message: "Pilih user atau isi nama guest terlebih dahulu",
    });

export const tournamentParticipantBulkSchema = z.object({
    text: z.string().trim().min(1, "Data peserta tidak boleh kosong"),
});

export const tournamentMatchesQuerySchema = z.object({
    status: z.enum(["ALL", ...MATCH_STATUS_VALUES] as const).optional(),
    round: z.coerce.number().int().min(1).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

const checkInAtSchema = z
    .string()
    .trim()
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), "Tanggal check-in tidak valid");

export const tournamentCheckInActionSchema = z
    .object({
        action: z.enum(["OPEN", "CLOSE"]).optional(),
        checkInAt: checkInAtSchema.optional(),
    })
    .refine((value) => value.action || value.checkInAt !== undefined, {
        message: "Aksi atau jadwal check-in wajib diisi",
    });

export const tournamentAnnouncementSchema = z.object({
    title: z.string().trim().min(3, "Judul minimal 3 karakter").max(191, "Judul terlalu panjang"),
    content: z.string().trim().min(5, "Isi pengumuman terlalu singkat").max(2000, "Isi pengumuman terlalu panjang"),
    pinned: z.boolean().optional(),
});

export const tournamentAnnouncementUpdateSchema = tournamentAnnouncementSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    "Minimal satu field harus diubah"
);

export const notificationReadSchema = z.object({
    id: z.string().cuid("Notification ID tidak valid"),
});

export const teamCreateSchema = z.object({
    name: z.string().trim().min(2, "Nama team minimal 2 karakter").max(191, "Nama team terlalu panjang"),
    description: z.string().trim().max(500, "Deskripsi team terlalu panjang").optional().or(z.literal("")),
    logoUrl: z.string().regex(LOCAL_UPLOAD_PATH_REGEX, "Gunakan logo hasil upload lokal").optional().or(z.literal("")),
});

export const teamRequestCreateSchema = z.object({
    name: z.string().trim().min(2, "Nama team minimal 2 karakter").max(191, "Nama team terlalu panjang"),
    description: z.string().trim().max(500, "Deskripsi team terlalu panjang").optional().or(z.literal("")),
    logoUrl: z.string().regex(LOCAL_UPLOAD_PATH_REGEX, "Gunakan logo hasil upload lokal").optional().or(z.literal("")),
});

export const teamRequestQuerySchema = z.object({
    status: z.enum(["ALL", ...TEAM_REQUEST_STATUS_VALUES] as const).optional(),
    mine: z.string().optional(),
});

export const teamRequestRejectSchema = z.object({
    reason: z.string().trim().max(500, "Alasan terlalu panjang").optional().or(z.literal("")),
});

export const teamUpdateSchema = teamCreateSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    "Minimal satu field harus diubah"
);

export const teamInviteSchema = z.object({
    teamId: z.string().cuid("Team ID tidak valid"),
    userId: z.string().cuid("User ID tidak valid"),
});

export const teamInviteDecisionSchema = z.object({
    inviteId: z.string().cuid("Invite ID tidak valid"),
});

export const teamJoinRequestSchema = z.object({
    teamId: z.string().cuid("Team ID tidak valid"),
});

export const teamJoinRequestDecisionSchema = z.object({
    joinRequestId: z.string().cuid("Join request ID tidak valid"),
});

export const teamMemberRemoveSchema = z.object({
    teamId: z.string().cuid("Team ID tidak valid"),
    memberId: z.string().cuid("Member ID tidak valid"),
});

export const teamMemberPromoteSchema = z.object({
    teamId: z.string().cuid("Team ID tidak valid"),
    memberId: z.string().cuid("Member ID tidak valid"),
    role: z.enum(TEAM_ROLE_VALUES).refine((role) => role !== "CAPTAIN", {
        message: "Gunakan endpoint transfer captain untuk mengganti captain",
    }),
});

export const teamTransferCaptainSchema = z.object({
    teamId: z.string().cuid("Team ID tidak valid"),
    memberId: z.string().cuid("Member ID tidak valid"),
});

export const teamLeaveSchema = z.object({
    teamId: z.string().cuid("Team ID tidak valid"),
});

export const teamDeleteSchema = z.object({
    teamId: z.string().cuid("Team ID tidak valid"),
});

export const tournamentStaffAssignSchema = z.object({
    userId: z.string().cuid("User ID tidak valid"),
    role: z.enum(TOURNAMENT_STAFF_ROLE_VALUES).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type TeamRosterAssignmentInput = z.infer<typeof teamRosterAssignmentSchema>;
export type TeamRosterAdminAssignInput = z.infer<typeof teamRosterAdminAssignSchema>;
export type UsersQueryInput = z.infer<typeof usersQuerySchema>;
export type TeamsQueryInput = z.infer<typeof teamsQuerySchema>;
export type TeamCreateInput = z.infer<typeof teamCreateSchema>;
export type TeamUpdateInput = z.infer<typeof teamUpdateSchema>;
export type TeamRequestCreateInput = z.infer<typeof teamRequestCreateSchema>;
export type TeamRequestQueryInput = z.infer<typeof teamRequestQuerySchema>;
export type TeamRequestRejectInput = z.infer<typeof teamRequestRejectSchema>;
export type TeamInviteInput = z.infer<typeof teamInviteSchema>;
export type TeamInviteDecisionInput = z.infer<typeof teamInviteDecisionSchema>;
export type TeamJoinRequestInput = z.infer<typeof teamJoinRequestSchema>;
export type TeamJoinRequestDecisionInput = z.infer<typeof teamJoinRequestDecisionSchema>;
export type TeamMemberRemoveInput = z.infer<typeof teamMemberRemoveSchema>;
export type TeamMemberPromoteInput = z.infer<typeof teamMemberPromoteSchema>;
export type TeamTransferCaptainInput = z.infer<typeof teamTransferCaptainSchema>;
export type TeamLeaveInput = z.infer<typeof teamLeaveSchema>;
export type TeamDeleteInput = z.infer<typeof teamDeleteSchema>;
export type TournamentStaffAssignInput = z.infer<typeof tournamentStaffAssignSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type NotificationReadInput = z.infer<typeof notificationReadSchema>;
export type TournamentParticipantAddInput = z.infer<typeof tournamentParticipantAddSchema>;
export type TournamentParticipantBulkInput = z.infer<typeof tournamentParticipantBulkSchema>;

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
    gameType: z.string().trim().min(2, "Pilih game"),
    ign: z.string().min(1, "IGN tidak boleh kosong"),
    gameId: z
        .string()
        .trim()
        .min(1, "Game ID / DUELIST ID tidak boleh kosong")
        .transform((value) => formatGameId(value))
        .refine((value) => normalizeGameIdDigits(value).length === 9 && isFormattedGameId(value), "Game ID harus terdiri dari 9 angka dengan format XXX-XXX-XXX"),
});

export type UpdateGameProfileInput = z.infer<typeof updateGameProfileSchema>;

export const profileAvatarSchema = z.object({
    avatarUrl: z.union([z.string().regex(LOCAL_UPLOAD_PATH_REGEX, "Gunakan gambar hasil upload lokal"), z.null()]),
});

export type ProfileAvatarInput = z.infer<typeof profileAvatarSchema>;

export const profileUpdateSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, "Username minimal 3 karakter")
        .max(24, "Username maksimal 24 karakter")
        .regex(USERNAME_REGEX, "Username hanya boleh huruf, angka, titik, underscore, dan strip")
        .transform((value) => value.toLowerCase()),
    email: z.string().trim().toLowerCase().email("Email tidak valid"),
    phoneWhatsapp: z.string().trim().regex(PHONE_REGEX, "Nomor WhatsApp tidak valid (contoh: +628123456789)"),
    provinceCode: z.string().trim().min(2, "Provinsi harus dipilih").max(16, "Kode provinsi tidak valid"),
    cityCode: z.string().trim().min(4, "Kabupaten / kota harus dipilih").max(16, "Kode kabupaten / kota tidak valid"),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

const tournamentBaseSchema = z.object({
    title: z.string().trim().min(3, "Judul turnamen minimal 3 karakter").max(191, "Judul turnamen terlalu panjang"),
    description: z.string().trim().max(1000, "Deskripsi terlalu panjang").optional().or(z.literal("")),
    format: z.enum(TOURNAMENT_FORMAT_VALUES, { message: "Format tidak valid" }),
    gameType: z.string().trim().min(2, "Pilih game"),
    structure: z.enum(TOURNAMENT_STRUCTURE_VALUES).optional(),
    mode: z.enum(TOURNAMENT_MODE_VALUES).optional(),
    isTeamTournament: z.boolean().optional(),
    status: z.enum(TOURNAMENT_STATUS_VALUES).optional(),
    entryFee: z.coerce.number().min(0, "Biaya masuk tidak boleh negatif"),
    prizePool: z.coerce.number().min(0, "Prize pool tidak boleh negatif"),
    minPlayers: z.coerce.number().int().min(2, "Min players minimal 2").optional(),
    bracketSize: z.coerce.number().int().min(2, "Bracket size minimal 2").optional(),
    maxPlayers: z.coerce.number().int().min(2, "Max players minimal 2").optional(),
    startAt: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Tanggal tidak valid" }),
    registrationOpen: z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || !Number.isNaN(Date.parse(value)), { message: "Tanggal registrasi tidak valid" }),
    registrationClose: z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || !Number.isNaN(Date.parse(value)), { message: "Tanggal registrasi tidak valid" }),
    checkinRequired: z.boolean().optional(),
    image: z.string().regex(LOCAL_UPLOAD_PATH_REGEX, "Gunakan gambar hasil upload lokal").optional().or(z.literal("")),
});

export const tournamentSchema = tournamentBaseSchema.superRefine((data, ctx) => {
    if (data.isTeamTournament) {
        if (!data.mode || data.mode === "INDIVIDUAL") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Mode team wajib dipilih",
                path: ["mode"],
            });
        }
    }
});

export type TournamentInput = z.infer<typeof tournamentSchema>;
export const tournamentUpdateSchema = tournamentBaseSchema.partial();
export type TournamentUpdateInput = z.infer<typeof tournamentUpdateSchema>;

export const tournamentRegisterSchema = z.object({
    paymentProofUrl: z.string().regex(LOCAL_UPLOAD_PATH_REGEX, "Gunakan bukti pembayaran hasil upload").optional(),
});

export type TournamentRegisterInput = z.infer<typeof tournamentRegisterSchema>;

export const tournamentPaymentDecisionSchema = z.object({
    status: z.enum(["VERIFIED", "REJECTED"] as const),
});

export type TournamentPaymentDecisionInput = z.infer<typeof tournamentPaymentDecisionSchema>;

export const matchReportSchema = z.object({
    scoreA: z.coerce.number().int().min(0).max(3),
    scoreB: z.coerce.number().int().min(0).max(3),
    winnerId: z.string().cuid("Winner ID tidak valid"),
});

export const matchDisputeSchema = z.object({
    reason: z.string().trim().max(500, "Alasan terlalu panjang").optional().or(z.literal("")),
});

export const matchAdminResolveSchema = matchReportSchema.extend({
    reason: z.string().trim().max(500, "Alasan terlalu panjang").optional().or(z.literal("")),
});

export const matchDisputeResolveSchema = matchReportSchema.extend({
    reason: z.string().trim().max(500, "Alasan terlalu panjang").optional().or(z.literal("")),
});

const matchScheduleAtSchema = z
    .string()
    .trim()
    .refine((value) => value === "" || parseLocalDateTime(value) !== null, "Tanggal tidak valid");

export const matchScheduleSchema = z.object({
    scheduledAt: z.union([matchScheduleAtSchema, z.null()]),
});

export type MatchReportInput = z.infer<typeof matchReportSchema>;
export type MatchDisputeInput = z.infer<typeof matchDisputeSchema>;
export type MatchAdminResolveInput = z.infer<typeof matchAdminResolveSchema>;
export type MatchDisputeResolveInput = z.infer<typeof matchDisputeResolveSchema>;
export type MatchScheduleInput = z.infer<typeof matchScheduleSchema>;



