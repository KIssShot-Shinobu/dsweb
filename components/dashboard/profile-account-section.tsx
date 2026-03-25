"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Mail, MapPin, MapPinned, Phone, User2 } from "lucide-react";
import { Modal } from "@/components/dashboard/modal";
import { useToast } from "@/components/dashboard/toast";
import { btnOutline, btnPrimary, inputCls, labelCls } from "@/components/dashboard/form-styles";
import { IndonesiaRegionFields, type RegionFormValue } from "@/components/shared/indonesia-region-fields";
import { SearchableCombobox, type SearchableOption } from "@/components/shared/searchable-combobox";
import { getCountryOptions } from "@/lib/country-options";
import { useLocale } from "@/hooks/use-locale";

type ProfileAccountSectionProps = {
    username: string;
    email: string;
    phoneWhatsapp: string;
    countryCode?: string | null;
    countryName?: string | null;
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
    countryCode: string;
    countryName: string;
    provinceCode: string;
    provinceName: string;
    cityCode: string;
    cityName: string;
    domicileType: "ID" | "INTL";
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
    countryCode,
    countryName,
    provinceCode,
    provinceName,
    cityCode,
    city,
    emailVerified,
}: ProfileAccountSectionProps) {
    const router = useRouter();
    const { t } = useLocale();
    const { success, error } = useToast();

    const initialState = useMemo(() => {
        const isInternational = Boolean(countryCode && countryCode !== "ID");
        return {
            username,
            email,
            phoneWhatsapp,
            countryCode: isInternational ? countryCode || "" : "",
            countryName: isInternational ? countryName || "" : "",
            provinceCode: provinceCode || "",
            provinceName: provinceName || "",
            cityCode: cityCode || "",
            cityName: city || "",
            domicileType: isInternational ? "INTL" : "ID",
        };
    }, [city, cityCode, countryCode, countryName, email, phoneWhatsapp, provinceCode, provinceName, username]);

    const summaryIsInternational = Boolean(countryCode && countryCode !== "ID");

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<ProfileFormState>(initialState);
    const [errors, setErrors] = useState<ProfileFormErrors>({});
    const [loading, setLoading] = useState(false);
    const countryOptions = useMemo<SearchableOption[]>(() => getCountryOptions(), []);

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
                error(data.message || t.dashboard.profile.account.messages.updateFailed);
                return;
            }

            success(data.message || t.dashboard.profile.account.messages.updateSuccess);
            closeModal();
            router.refresh();
        } catch {
            error(t.common.networkError);
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

    const selectedCountry = useMemo(
        () => countryOptions.find((option) => option.value === form.countryCode),
        [countryOptions, form.countryCode],
    );

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
                            {t.dashboard.profile.account.sectionTitle}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-base-content/60">
                            {t.dashboard.profile.account.sectionDescription}
                        </p>
                    </div>

                    <span className={`${btnOutline} gap-2 px-3 py-2 text-xs font-semibold opacity-85 transition group-hover:opacity-100`}>
                        <Edit3 className="h-3.5 w-3.5" />
                        {t.dashboard.profile.account.actions.edit}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <SummaryRow icon={<User2 className="h-4 w-4" />} label={t.dashboard.profile.account.summary.username} value={`@${username}`} />
                    <SummaryRow icon={<Mail className="h-4 w-4" />} label={t.dashboard.profile.account.summary.email} value={email} />
                    <SummaryRow icon={<Phone className="h-4 w-4" />} label={t.dashboard.profile.account.summary.whatsapp} value={phoneWhatsapp || t.dashboard.profile.account.summary.empty} />
                    {summaryIsInternational ? (
                        <SummaryRow icon={<MapPinned className="h-4 w-4" />} label={t.dashboard.profile.account.summary.country} value={countryName || t.dashboard.profile.account.summary.empty} />
                    ) : (
                        <>
                            <SummaryRow icon={<MapPinned className="h-4 w-4" />} label={t.dashboard.profile.account.summary.province} value={provinceName || t.dashboard.profile.account.summary.empty} />
                            <div className="xl:col-span-2">
                                <SummaryRow icon={<MapPin className="h-4 w-4" />} label={t.dashboard.profile.account.summary.city} value={city || t.dashboard.profile.account.summary.empty} />
                            </div>
                        </>
                    )}
                </div>

                {!emailVerified ? (
                    <p className="mt-4 text-xs leading-5 text-warning">
                        {t.dashboard.profile.account.unverifiedNotice}
                    </p>
                ) : null}
            </button>

            <Modal open={open} onClose={closeModal} title={t.dashboard.profile.account.modalTitle} size="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelCls}>{t.dashboard.profile.account.fields.username}</label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value.toLowerCase() }))}
                            className={inputCls}
                            placeholder={t.dashboard.profile.account.placeholders.username}
                            required
                        />
                        <FieldError field="username" />
                    </div>

                    <div>
                        <label className={labelCls}>{t.dashboard.profile.account.fields.email}</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                            className={inputCls}
                            placeholder={t.dashboard.profile.account.placeholders.email}
                            required
                        />
                        <FieldError field="email" />
                    </div>

                    <div>
                        <label className={labelCls}>{t.dashboard.profile.account.fields.whatsapp}</label>
                        <input
                            type="tel"
                            value={form.phoneWhatsapp}
                            onChange={(event) => setForm((current) => ({ ...current, phoneWhatsapp: event.target.value }))}
                            className={inputCls}
                            placeholder={t.dashboard.profile.account.placeholders.whatsapp}
                            required
                        />
                        <FieldError field="phoneWhatsapp" />
                    </div>

                    <div className="rounded-box border border-base-300 bg-base-200/50 px-4 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content/55">{t.dashboard.profile.account.domicile.title}</div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                className={`btn ${form.domicileType === "ID" ? "btn-primary" : "btn-outline"} w-full rounded-box`}
                                onClick={() =>
                                    setForm((current) => ({
                                        ...current,
                                        domicileType: "ID",
                                        countryCode: "",
                                        countryName: "",
                                    }))
                                }
                            >
                                {t.dashboard.profile.account.domicile.indonesia}
                            </button>
                            <button
                                type="button"
                                className={`btn ${form.domicileType === "INTL" ? "btn-primary" : "btn-outline"} w-full rounded-box`}
                                onClick={() =>
                                    setForm((current) => ({
                                        ...current,
                                        domicileType: "INTL",
                                        provinceCode: "",
                                        provinceName: "",
                                        cityCode: "",
                                        cityName: "",
                                    }))
                                }
                            >
                                {t.dashboard.profile.account.domicile.international}
                            </button>
                        </div>
                        <p className="mt-3 text-xs text-base-content/55">
                            {t.dashboard.profile.account.domicile.hint}
                        </p>
                    </div>

                    {form.domicileType === "INTL" ? (
                        <div>
                            <label className={labelCls}>{t.dashboard.profile.account.country.label}</label>
                            <SearchableCombobox
                                value={form.countryCode}
                                onChange={(option) =>
                                    setForm((current) => ({
                                        ...current,
                                        countryCode: option.value,
                                        countryName: option.label,
                                    }))
                                }
                                options={countryOptions}
                                placeholder={t.dashboard.profile.account.country.placeholder}
                                searchPlaceholder={t.dashboard.profile.account.country.searchPlaceholder}
                                emptyMessage={t.dashboard.profile.account.country.empty}
                                triggerClassName="bg-base-100"
                                menuClassName="bg-base-100"
                                inputClassName="bg-base-100"
                            />
                            {errors.countryCode?.length ? <FieldError field="countryCode" /> : <FieldError field="countryName" />}
                            {!errors.countryCode && !errors.countryName && selectedCountry ? (
                                <div className="mt-1 text-xs text-base-content/45">{selectedCountry.label}</div>
                            ) : null}
                        </div>
                    ) : (
                        <IndonesiaRegionFields
                            variant="dashboard"
                            value={regionValue}
                            onChange={(region) => setForm((current) => ({ ...current, ...region }))}
                            errors={{ provinceCode: errors.provinceCode, cityCode: errors.cityCode }}
                        />
                    )}

                    <div className="rounded-box border border-base-300 bg-base-200/50 px-4 py-3 text-sm leading-6 text-base-content/60">
                        {t.dashboard.profile.account.emailResetNote}
                    </div>

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={closeModal} className={btnOutline}>
                            {t.dashboard.profile.account.actions.cancel}
                        </button>
                        <button type="submit" disabled={loading} className={btnPrimary}>
                            {loading ? t.dashboard.profile.account.actions.saving : t.dashboard.profile.account.actions.save}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
