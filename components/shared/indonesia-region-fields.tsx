"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableCombobox, type SearchableOption } from "@/components/shared/searchable-combobox";

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

const authLabelClass = "mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/55";
const dashboardLabelClass = "mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/55";

const authTriggerClass = "border-white/10 bg-white/5 text-white hover:border-white/20 dark:border-white/10 dark:bg-white/5";
const authMenuClass = "border-white/10 bg-[#151515]";
const authInputClass = "border-white/10 bg-white/5 text-white placeholder:text-white/30 dark:border-white/10 dark:bg-white/5";
const authOptionClass = "";

const dashboardTriggerClass = "border-black/5 bg-white/80 text-slate-950 hover:border-black/10 dark:border-white/10 dark:bg-[#11161d] dark:text-white";
const dashboardMenuClass = "border-black/5 bg-white dark:border-white/10 dark:bg-[#11161d]";
const dashboardInputClass = "border-black/5 bg-white text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#11161d] dark:text-white dark:placeholder:text-white/35";
const dashboardOptionClass = "";

function getFieldErrorMessage(input?: string | string[]) {
    if (!input) return null;
    return Array.isArray(input) ? input[0] : input;
}

export function IndonesiaRegionFields({ value, onChange, errors, variant = "auth" }: IndonesiaRegionFieldsProps) {
    const [provinces, setProvinces] = useState<SearchableOption[]>([]);
    const [regencies, setRegencies] = useState<SearchableOption[]>([]);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingRegencies, setLoadingRegencies] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoadingProvinces(true);

        fetch("/api/regions/provinces")
            .then(async (response) => {
                const data = (await response.json()) as RegionApiResponse<{ provinces: Array<{ code: string; name: string }> }>;
                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Gagal memuat data provinsi");
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
            setRegencies([]);
            return () => {
                isMounted = false;
            };
        }

        setLoadingRegencies(true);
        fetch(`/api/regions/regencies?provinceCode=${encodeURIComponent(value.provinceCode)}`)
            .then(async (response) => {
                const data = (await response.json()) as RegionApiResponse<{ regencies: Array<{ code: string; name: string }> }>;
                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Gagal memuat data kabupaten / kota");
                }
                if (!isMounted) return;
                setRegencies(data.regencies.map((item) => ({ value: item.code, label: item.name })));
            })
            .catch(() => {
                if (isMounted) setRegencies([]);
            })
            .finally(() => {
                if (isMounted) setLoadingRegencies(false);
            });

        return () => {
            isMounted = false;
        };
    }, [value.provinceCode]);

    const provinceError = getFieldErrorMessage(errors?.provinceCode);
    const cityError = getFieldErrorMessage(errors?.cityCode);

    const selectedProvinceOption = useMemo(
        () => provinces.find((item) => item.value === value.provinceCode),
        [provinces, value.provinceCode],
    );

    const selectedCityOption = useMemo(
        () => regencies.find((item) => item.value === value.cityCode),
        [regencies, value.cityCode],
    );

    const labelClass = variant === "auth" ? authLabelClass : dashboardLabelClass;
    const triggerClass = variant === "auth" ? authTriggerClass : dashboardTriggerClass;
    const menuClass = variant === "auth" ? authMenuClass : dashboardMenuClass;
    const inputClass = variant === "auth" ? authInputClass : dashboardInputClass;
    const optionClass = variant === "auth" ? authOptionClass : dashboardOptionClass;
    const hintClass = variant === "auth" ? "mt-1 text-xs text-white/30" : "mt-1 text-xs text-slate-500 dark:text-white/40";
    const errorClass = "mt-1 text-xs text-red-400";

    return (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
            <div>
                <label className={labelClass}>Provinsi *</label>
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
                    placeholder={loadingProvinces ? "Memuat provinsi..." : "Pilih provinsi"}
                    searchPlaceholder="Cari provinsi"
                    emptyMessage="Provinsi tidak ditemukan"
                    disabled={loadingProvinces}
                    triggerClassName={triggerClass}
                    menuClassName={menuClass}
                    inputClassName={inputClass}
                    optionClassName={optionClass}
                />
                {provinceError ? <div className={errorClass}>{provinceError}</div> : null}
                {!provinceError && selectedProvinceOption ? <div className={hintClass}>{selectedProvinceOption.label}</div> : null}
            </div>

            <div>
                <label className={labelClass}>Kabupaten / Kota *</label>
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
                    options={regencies}
                    placeholder={value.provinceCode ? (loadingRegencies ? "Memuat kabupaten / kota..." : "Pilih kabupaten / kota") : "Pilih provinsi dulu"}
                    searchPlaceholder="Cari kabupaten / kota"
                    emptyMessage="Kabupaten / kota tidak ditemukan"
                    disabled={!value.provinceCode || loadingRegencies}
                    triggerClassName={triggerClass}
                    menuClassName={menuClass}
                    inputClassName={inputClass}
                    optionClassName={optionClass}
                />
                {cityError ? <div className={errorClass}>{cityError}</div> : null}
                {!cityError && selectedCityOption ? <div className={hintClass}>{selectedCityOption.label}</div> : null}
            </div>
        </div>
    );
}
