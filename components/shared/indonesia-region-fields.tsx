"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableCombobox, type SearchableOption } from "@/components/shared/searchable-combobox";
import { useLocale } from "@/hooks/use-locale";

export type RegionFormValue = {
    provinceCode: string;
    provinceName: string;
    cityCode: string;
    cityName: string;
};

type IndonesiaRegionFieldsProps = {
    value: RegionFormValue;
    onChange: (value: RegionFormValue) => void;
    errors?: Partial<Record<"provinceCode" | "cityCode", string | string[]>>;
    variant?: "auth" | "dashboard";
};

type RegionApiResponse<T> = {
    success: boolean;
    message?: string;
} & T;

const labelClass = "label pb-2 pt-0 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/55";
const triggerClass = "bg-base-100";
const menuClass = "bg-base-100";
const inputClass = "bg-base-100";

function getFieldErrorMessage(input?: string | string[]) {
    if (!input) return null;
    return Array.isArray(input) ? input[0] : input;
}

export function IndonesiaRegionFields({ value, onChange, errors, variant = "auth" }: IndonesiaRegionFieldsProps) {
    const { t } = useLocale();
    const [provinces, setProvinces] = useState<SearchableOption[]>([]);
    const [regencies, setRegencies] = useState<SearchableOption[]>([]);
    const [loadingProvinces, setLoadingProvinces] = useState(true);
    const [loadedProvinceCode, setLoadedProvinceCode] = useState("");

    useEffect(() => {
        let isMounted = true;

        fetch("/api/regions/provinces")
            .then(async (response) => {
                const data = (await response.json()) as RegionApiResponse<{ provinces: Array<{ code: string; name: string }> }>;
                if (!response.ok || !data.success) {
                    throw new Error(data.message || t.profile.account.region.loadProvinceFailed);
                }
                if (!isMounted) return;
                setProvinces(data.provinces.map((item) => ({ value: item.code, label: item.name })));
            })
            .catch(() => {
                if (isMounted) setProvinces([]);
            })
            .finally(() => {
                if (isMounted) setLoadingProvinces(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        if (!value.provinceCode) {
            return () => {
                isMounted = false;
            };
        }

        fetch(`/api/regions/regencies?provinceCode=${encodeURIComponent(value.provinceCode)}`)
            .then(async (response) => {
                const data = (await response.json()) as RegionApiResponse<{ regencies: Array<{ code: string; name: string }> }>;
                if (!response.ok || !data.success) {
                    throw new Error(data.message || t.profile.account.region.loadCityFailed);
                }
                if (!isMounted) return;
                setRegencies(data.regencies.map((item) => ({ value: item.code, label: item.name })));
                setLoadedProvinceCode(value.provinceCode);
            })
            .catch(() => {
                if (isMounted) {
                    setRegencies([]);
                    setLoadedProvinceCode(value.provinceCode);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [value.provinceCode]);

    const provinceError = getFieldErrorMessage(errors?.provinceCode);
    const cityError = getFieldErrorMessage(errors?.cityCode);
    const availableRegencies = useMemo(
        () => (loadedProvinceCode === value.provinceCode ? regencies : []),
        [loadedProvinceCode, regencies, value.provinceCode],
    );

    const selectedProvinceOption = useMemo(
        () => provinces.find((item) => item.value === value.provinceCode),
        [provinces, value.provinceCode],
    );

    const selectedCityOption = useMemo(
        () => availableRegencies.find((item) => item.value === value.cityCode),
        [availableRegencies, value.cityCode],
    );

    const hintClass = variant === "auth" ? "mt-1 text-xs text-base-content/45" : "mt-1 text-xs text-base-content/45";
    const errorClass = "mt-1 text-xs text-red-400";

    return (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
            <div>
                <label className={labelClass}>{t.profile.account.region.provinceLabel} *</label>
                <SearchableCombobox
                    value={value.provinceCode}
                    onChange={(option) =>
                        onChange({
                            provinceCode: option.value,
                            provinceName: option.label,
                            cityCode: "",
                            cityName: "",
                        })
                    }
                    options={provinces}
                    placeholder={loadingProvinces ? t.profile.account.region.provinceLoading : t.profile.account.region.provincePlaceholder}
                    searchPlaceholder={t.profile.account.region.provinceSearchPlaceholder}
                    emptyMessage={t.profile.account.region.provinceEmpty}
                    disabled={loadingProvinces}
                    triggerClassName={triggerClass}
                    menuClassName={menuClass}
                    inputClassName={inputClass}
                />
                {provinceError ? <div className={errorClass}>{provinceError}</div> : null}
                {!provinceError && selectedProvinceOption ? <div className={hintClass}>{selectedProvinceOption.label}</div> : null}
            </div>

            <div>
                <label className={labelClass}>{t.profile.account.region.cityLabel} *</label>
                <SearchableCombobox
                    value={value.cityCode}
                    onChange={(option) =>
                        onChange({
                            provinceCode: value.provinceCode,
                            provinceName: value.provinceName,
                            cityCode: option.value,
                            cityName: option.label,
                        })
                    }
                    options={availableRegencies}
                    placeholder={value.provinceCode ? t.profile.account.region.cityPlaceholder : t.profile.account.region.cityPlaceholderDisabled}
                    searchPlaceholder={t.profile.account.region.citySearchPlaceholder}
                    emptyMessage={t.profile.account.region.cityEmpty}
                    disabled={!value.provinceCode}
                    triggerClassName={triggerClass}
                    menuClassName={menuClass}
                    inputClassName={inputClass}
                />
                {cityError ? <div className={errorClass}>{cityError}</div> : null}
                {!cityError && selectedCityOption ? <div className={hintClass}>{selectedCityOption.label}</div> : null}
            </div>
        </div>
    );
}
