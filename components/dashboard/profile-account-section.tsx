"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Mail, MapPin, MapPinned, Phone, User2 } from "lucide-react";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { IndonesiaRegionFields, type RegionFormValue } from "@/components/shared/indonesia-region-fields";

type ProfileAccountSectionProps = {
    username: string;
    email: string;
    phoneWhatsapp: string;
    provinceCode?: string | null;
    provinceName?: string | null;
    cityCode?: string | null;
    city: string;
    emailVerified: boolean;
};

type ProfileFormState = {
    username: string;
    email: string;
    phoneWhatsapp: string;
    provinceCode: string;
    provinceName: string;
    cityCode: string;
    cityName: string;
};

type ProfileFormErrors = Partial<Record<keyof ProfileFormState, string[]>>;

function SummaryRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-base-200 text-base-content/55">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-base-content/45">{label}</div>
                <div className="mt-1 break-words text-sm font-medium text-base-content">{value}</div>
            </div>
        </div>
    );
}

export function ProfileAccountSection({
    username,
    email,
    phoneWhatsapp,
    provinceCode,
    provinceName,
    cityCode,
    city,
    emailVerified,
}: ProfileAccountSectionProps) {
    const router = useRouter();
    const { success, error } = useToast();

    const initialState = useMemo(
        () => ({
            username,
            email,
            phoneWhatsapp,
            provinceCode: provinceCode || "",
            provinceName: provinceName || "",
            cityCode: cityCode || "",
            cityName: city || "",
        }),
        [city, cityCode, email, phoneWhatsapp, provinceCode, provinceName, username],
    );

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<ProfileFormState>(initialState);
    const [errors, setErrors] = useState<ProfileFormErrors>({});
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
        setForm(initialState);
        setErrors({});
    };

    const closeModal = () => {
        setOpen(false);
        resetForm();
    };

    const openModal = () => {
        setForm(initialState);
        setErrors({});
        setOpen(true);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setErrors((data.errors || {}) as ProfileFormErrors);
                error(data.message || "Gagal memperbarui profil akun");
                return;
            }

            success(data.message || "Profil akun berhasil diperbarui");
            closeModal();
            router.refresh();
        } catch {
            error("Terjadi kesalahan jaringan");
        } finally {
            setLoading(false);
        }
    };

    const FieldError = ({ field }: { field: keyof ProfileFormState }) =>
        errors[field]?.length ? <div className="mt-1 text-xs text-red-400">{errors[field]?.[0]}</div> : null;

    const regionValue: RegionFormValue = {
        provinceCode: form.provinceCode,
        provinceName: form.provinceName,
        cityCode: form.cityCode,
        cityName: form.cityName,
    };

    return (
        <>
            <button
                type="button"
                onClick={openModal}
                className="group block w-full rounded-[24px] p-0 text-left transition-all hover:-translate-y-0.5"
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">
                            Data Akun
                        </div>
                        <p className="mt-1 text-sm leading-6 text-base-content/60">
                            Klik ringkasan ini untuk mengubah username, email, WhatsApp, dan wilayah domisili.
                        </p>
                    </div>

                    <span className={`${btnOutline} gap-2 px-3 py-2 text-xs font-semibold opacity-85 transition group-hover:opacity-100`}>
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <SummaryRow icon={<User2 className="h-4 w-4" />} label="Username" value={`@${username}`} />
                    <SummaryRow icon={<Mail className="h-4 w-4" />} label="Email" value={email} />
                    <SummaryRow icon={<Phone className="h-4 w-4" />} label="WhatsApp" value={phoneWhatsapp || "-"} />
                    <SummaryRow icon={<MapPinned className="h-4 w-4" />} label="Provinsi" value={provinceName || "-"} />
                    <div className="xl:col-span-2">
                        <SummaryRow icon={<MapPin className="h-4 w-4" />} label="Kabupaten / Kota" value={city || "-"} />
                    </div>
                </div>

                {!emailVerified ? (
                    <p className="mt-4 text-xs leading-5 text-warning">
                        Email belum terverifikasi. Jika email diubah, verifikasi akan direset dan perlu dikirim ulang dari settings.
                    </p>
                ) : null}
            </button>

            <Modal open={open} onClose={closeModal} title="Edit Data Akun" size="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelCls}>Username</label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value.toLowerCase() }))}
                            className={inputCls}
                            placeholder="duelstandby.id"
                            required
                        />
                        <FieldError field="username" />
                    </div>

                    <div>
                        <label className={labelCls}>Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                            className={inputCls}
                            placeholder="you@example.com"
                            required
                        />
                        <FieldError field="email" />
                    </div>

                    <div>
                        <label className={labelCls}>WhatsApp</label>
                        <input
                            type="tel"
                            value={form.phoneWhatsapp}
                            onChange={(event) => setForm((current) => ({ ...current, phoneWhatsapp: event.target.value }))}
                            className={inputCls}
                            placeholder="+628123456789"
                            required
                        />
                        <FieldError field="phoneWhatsapp" />
                    </div>

                    <IndonesiaRegionFields
                        variant="dashboard"
                        value={regionValue}
                        onChange={(region) => setForm((current) => ({ ...current, ...region }))}
                        errors={{ provinceCode: errors.provinceCode, cityCode: errors.cityCode }}
                    />

                    <div className="rounded-box border border-base-300 bg-base-200/50 px-4 py-3 text-sm leading-6 text-base-content/60">
                        Jika email diubah, status verifikasi email akan direset. Anda bisa mengirim ulang link verifikasi dari halaman settings.
                    </div>

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={closeModal} className={btnOutline}>
                            Batal
                        </button>
                        <button type="submit" disabled={loading} className={btnPrimary}>
                            {loading ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
