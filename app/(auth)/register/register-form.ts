import { formatGameId, normalizeGameIdDigits } from "@/lib/game-id";

export type RegistrationFormData = {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    phoneWhatsapp: string;
    provinceCode: string;
    provinceName: string;
    cityCode: string;
    cityName: string;
    duelLinksGameId: string;
    duelLinksIgn: string;
    duelLinksScreenshotUploadId: string;
    masterDuelGameId: string;
    masterDuelIgn: string;
    masterDuelScreenshotUploadId: string;
    sourceInfo: string;
    socialMedia: string[];
    agreement: boolean;
};

export type UploadField = "duelLinksScreenshotUploadId" | "masterDuelScreenshotUploadId";
export type UploadPreviewKey = "duelLinks" | "masterDuel";
export type UploadPreview = { previewUrl: string; expiresAt: string };
export type FormErrors = Record<string, string>;

export const INITIAL_FORM: RegistrationFormData = {
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneWhatsapp: "",
    provinceCode: "",
    provinceName: "",
    cityCode: "",
    cityName: "",
    duelLinksGameId: "",
    duelLinksIgn: "",
    duelLinksScreenshotUploadId: "",
    masterDuelGameId: "",
    masterDuelIgn: "",
    masterDuelScreenshotUploadId: "",
    sourceInfo: "",
    socialMedia: [],
    agreement: false,
};

export const SOCIAL_OPTIONS = ["WhatsApp", "Instagram", "Facebook", "TikTok", "YouTube", "Discord", "Rekomendasi Teman"];
export const SOURCE_OPTIONS = ["Media sosial", "YouTube", "Discord", "Rekomendasi teman", "Turnamen online", "Lainnya"];
export const REGISTER_STEPS = [
    { title: "Akun", icon: "1", desc: "Identitas akun utama Anda" },
    { title: "Profil Game", icon: "2", desc: "Data Duel Links atau Master Duel" },
    { title: "Komunitas", icon: "3", desc: "Sumber informasi dan kanal aktif" },
    { title: "Konfirmasi", icon: "4", desc: "Persetujuan akhir pendaftaran" },
];

const IGN_REGEX = /^[A-Za-z0-9 _.\-\[\]()]{2,32}$/;

export function validateRegisterStep(form: RegistrationFormData, targetStep: number): FormErrors {
    const nextErrors: FormErrors = {};

    if (targetStep === 1) {
        if (!form.username || form.username.length < 3) nextErrors.username = "Username minimal 3 karakter";
        if (form.username && !/^[a-zA-Z0-9._-]{3,24}$/.test(form.username)) nextErrors.username = "Username hanya boleh berisi huruf, angka, titik, underscore, dan strip";
        if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = "Masukkan alamat email yang valid";
        if (!form.password || form.password.length < 8) nextErrors.password = "Kata sandi minimal 8 karakter";
        if (!/[A-Za-z]/.test(form.password)) nextErrors.password = "Kata sandi harus mengandung huruf";
        if (!/[0-9]/.test(form.password)) nextErrors.password = "Kata sandi harus mengandung angka";
        if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Konfirmasi kata sandi belum cocok";
        if (!form.phoneWhatsapp || !/^\+?[0-9]{10,15}$/.test(form.phoneWhatsapp)) nextErrors.phoneWhatsapp = "Masukkan nomor WhatsApp yang valid";
        if (!form.provinceCode) nextErrors.provinceCode = "Pilih provinsi terlebih dahulu";
        if (!form.cityCode) nextErrors.cityCode = "Pilih kabupaten atau kota";
    }

    if (targetStep === 2) {
        const hasDuelLinks = Boolean(form.duelLinksGameId && form.duelLinksIgn);
        const hasMasterDuel = Boolean(form.masterDuelGameId && form.masterDuelIgn);

        if (!hasDuelLinks && !hasMasterDuel) nextErrors.duelLinksGameId = "Lengkapi minimal satu profil game";
        if (form.duelLinksGameId && normalizeGameIdDigits(form.duelLinksGameId).length !== 9) nextErrors.duelLinksGameId = "Game ID Duel Links harus terdiri dari 9 digit";
        if (form.masterDuelGameId && normalizeGameIdDigits(form.masterDuelGameId).length !== 9) nextErrors.masterDuelGameId = "Game ID Master Duel harus terdiri dari 9 digit";
        if (form.duelLinksIgn && !IGN_REGEX.test(form.duelLinksIgn)) nextErrors.duelLinksIgn = "IGN Duel Links mengandung karakter yang belum didukung";
        if (form.masterDuelIgn && !IGN_REGEX.test(form.masterDuelIgn)) nextErrors.masterDuelIgn = "IGN Master Duel mengandung karakter yang belum didukung";
    }

    if (targetStep === 3) {
        if (!form.sourceInfo) nextErrors.sourceInfo = "Pilih sumber informasi yang paling relevan";
        if (form.socialMedia.length === 0) nextErrors.socialMedia = "Pilih minimal satu kanal aktif";
    }

    if (targetStep === 4 && !form.agreement) nextErrors.agreement = "Anda perlu menyetujui pernyataan ini untuk melanjutkan";

    return nextErrors;
}

export function formatRegisterGameId(value: string) {
    return formatGameId(value);
}
