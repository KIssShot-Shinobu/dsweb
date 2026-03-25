import type { Locale } from "@/lib/i18n/locales";

export function getIntlLocale(locale: Locale): string {
    return locale === "en" ? "en-US" : "id-ID";
}

export function formatDate(
    value: Date | string | number,
    locale: Locale,
    options?: Intl.DateTimeFormatOptions
): string {
    return new Date(value).toLocaleDateString(getIntlLocale(locale), options);
}

export function formatDateTime(
    value: Date | string | number,
    locale: Locale,
    options?: Intl.DateTimeFormatOptions
): string {
    return new Date(value).toLocaleString(getIntlLocale(locale), options);
}

export function formatCurrency(
    amount: number,
    locale: Locale,
    currency: string = "IDR"
): string {
    return new Intl.NumberFormat(getIntlLocale(locale), {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
    }).format(amount);
}
