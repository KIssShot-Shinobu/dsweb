import { COOKIE_NAME, DEFAULT_LOCALE, STORAGE_KEY, isLocale, type Locale } from "@/lib/i18n/locales";

export function getStoredLocale(): Locale | null {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : null;
}

export function getCookieLocale(): Locale | null {
    if (typeof document === "undefined") return null;
    const cookies = document.cookie.split(";").map((item) => item.trim());
    const match = cookies.find((item) => item.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    const value = match.split("=")[1];
    return isLocale(value) ? value : null;
}

export function detectClientLocale(): Locale {
    const stored = getStoredLocale() ?? getCookieLocale();
    if (stored) return stored;
    const lang = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "";
    if (lang.startsWith("en")) return "en";
    if (lang.startsWith("id")) return "id";
    return DEFAULT_LOCALE;
}

export function persistLocale(locale: Locale) {
    if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, locale);
    }
    if (typeof document !== "undefined") {
        document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }
}
