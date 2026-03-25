import { cookies, headers } from "next/headers";
import { COOKIE_NAME, DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function getServerLocale(): Promise<Locale> {
    const cookieStore = await cookies();
    const stored = cookieStore.get(COOKIE_NAME)?.value;
    if (isLocale(stored)) return stored;

    const headerStore = await headers();
    const acceptLanguage = headerStore.get("accept-language") ?? "";
    const preferred = acceptLanguage.split(",")[0]?.trim().toLowerCase();
    if (preferred?.startsWith("en")) return "en";
    if (preferred?.startsWith("id")) return "id";

    return DEFAULT_LOCALE;
}

export async function getServerDictionary() {
    const locale = await getServerLocale();
    return { locale, t: getDictionary(locale) };
}
