export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "id";
export const COOKIE_NAME = "ds_locale";
export const STORAGE_KEY = "ds_locale";

export function isLocale(value: string | null | undefined): value is Locale {
    return value === "id" || value === "en";
}
