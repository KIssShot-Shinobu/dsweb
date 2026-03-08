export type RegistrationFormData = {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    phoneWhatsapp: string;
    city: string;
    duelLinksGameId: string;
    duelLinksIgn: string;
    duelLinksScreenshotUploadId: string;
    masterDuelGameId: string;
    masterDuelIgn: string;
    masterDuelScreenshotUploadId: string;
    sourceInfo: string;
    prevGuild: string;
    guildStatus: string;
    socialMedia: string[];
    agreement: boolean;
};

export type UploadField = "duelLinksScreenshotUploadId" | "masterDuelScreenshotUploadId";
export type UploadPreviewKey = "duelLinks" | "masterDuel";
export type UploadPreview = { previewUrl: string; expiresAt: string };
export type FormErrors = Record<string, string>;

export const INITIAL_FORM: RegistrationFormData = {
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneWhatsapp: "",
    city: "",
    duelLinksGameId: "",
    duelLinksIgn: "",
    duelLinksScreenshotUploadId: "",
    masterDuelGameId: "",
    masterDuelIgn: "",
    masterDuelScreenshotUploadId: "",
    sourceInfo: "",
    prevGuild: "",
    guildStatus: "",
    socialMedia: [],
    agreement: false,
};

export const SOCIAL_OPTIONS = ["WhatsApp", "Instagram", "Facebook", "TikTok", "Twitter/X", "YouTube", "Discord", "Friend Referral"];
export const SOURCE_OPTIONS = ["Media sosial (Instagram/FB/TikTok)", "YouTube", "Discord", "Teman/Kenalan", "Tournament online", "Lainnya"];
export const REGISTER_STEPS = [
    { title: "Akun", icon: "1", desc: "Data akun aktif Anda" },
    { title: "Game Profile", icon: "2", desc: "Profil Duel Links / Master Duel" },
    { title: "Komunitas", icon: "3", desc: "Background komunitas dan kontak" },
    { title: "Persetujuan", icon: "4", desc: "Syarat penggunaan akun" },
];

const IGN_REGEX = /^[A-Za-z0-9 _.\-\[\]()]{2,32}$/;

export function validateRegisterStep(form: RegistrationFormData, targetStep: number): FormErrors {
    const nextErrors: FormErrors = {};

    if (targetStep === 1) {
        if (!form.fullName || form.fullName.length < 3) nextErrors.fullName = "Nama minimal 3 karakter";
        if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = "Email tidak valid";
        if (!form.password || form.password.length < 8) nextErrors.password = "Password minimal 8 karakter";
        if (!/[A-Za-z]/.test(form.password)) nextErrors.password = "Password harus mengandung huruf";
        if (!/[0-9]/.test(form.password)) nextErrors.password = "Password harus mengandung angka";
        if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Password tidak cocok";
        if (!form.phoneWhatsapp || !/^\+?[0-9]{10,15}$/.test(form.phoneWhatsapp)) nextErrors.phoneWhatsapp = "Nomor WhatsApp tidak valid";
        if (!form.city || form.city.length < 2) nextErrors.city = "Kota harus diisi";
    }

    if (targetStep === 2) {
        const hasDuelLinks = Boolean(form.duelLinksGameId && form.duelLinksIgn);
        const hasMasterDuel = Boolean(form.masterDuelGameId && form.masterDuelIgn);

        if (!hasDuelLinks && !hasMasterDuel) nextErrors.duelLinksGameId = "Minimal satu game profile wajib diisi";
        if (form.duelLinksIgn && !IGN_REGEX.test(form.duelLinksIgn)) nextErrors.duelLinksIgn = "IGN Duel Links mengandung karakter yang tidak valid";
        if (form.masterDuelIgn && !IGN_REGEX.test(form.masterDuelIgn)) nextErrors.masterDuelIgn = "IGN Master Duel mengandung karakter yang tidak valid";
    }

    if (targetStep === 3) {
        if (!form.sourceInfo) nextErrors.sourceInfo = "Sumber informasi harus diisi";
        if (!form.guildStatus) nextErrors.guildStatus = "Pilih status komunitas Anda";
        if (form.socialMedia.length === 0) nextErrors.socialMedia = "Pilih minimal 1 sosial media";
    }

    if (targetStep === 4 && !form.agreement) nextErrors.agreement = "Anda harus menyetujui pernyataan";

    return nextErrors;
}
