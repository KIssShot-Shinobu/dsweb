import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/id";
import { getIntlLocale } from "@/lib/i18n/format";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

dayjs.extend(customParseFormat);
dayjs.locale("id");

export const LOCAL_DATE_TIME_FORMAT = "YYYY-MM-DDTHH:mm";
export const DISPLAY_DATE_TIME_FORMAT = "DD MMM YYYY HH:mm";

export function parseLocalDateTime(value: string | null | undefined) {
    if (!value) return null;
    const parsed = dayjs(value, [LOCAL_DATE_TIME_FORMAT, "YYYY-MM-DD HH:mm:ss", dayjs.ISO_8601], "id", true);
    return parsed.isValid() ? parsed.toDate() : null;
}

export function formatLocalDateTime(value: Date | null | undefined) {
    if (!value) return "";
    return dayjs(value).format(LOCAL_DATE_TIME_FORMAT);
}

type LocalDateParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

const getDateTimeParts = (value: Date, timeZone: string) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts = formatter.formatToParts(value);
    const result: Record<string, string> = {};
    parts.forEach((part) => {
        if (part.type !== "literal") {
            result[part.type] = part.value;
        }
    });
    return {
        year: Number(result.year),
        month: Number(result.month),
        day: Number(result.day),
        hour: Number(result.hour),
        minute: Number(result.minute),
        second: Number(result.second),
    };
};

const formatLocalDate = (value: Date, timeZone: string) => {
    const parts = getDateTimeParts(value, timeZone);
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
};

export function formatLocalDateTimeInTimeZone(value: Date | null | undefined, timeZone: string) {
    if (!value) return "";
    return formatLocalDate(value, timeZone);
}

export function formatDisplayDateTimeInTimeZone(
    value: Date | null | undefined,
    timeZone: string,
    locale: Locale = DEFAULT_LOCALE
) {
    if (!value) return "";
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
        timeZone,
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
    }).format(value);
}

export function parseLocalDateTimeInTimeZone(value: string | null | undefined, timeZone: string) {
    if (!value) return null;
    const parsed = dayjs(value, [LOCAL_DATE_TIME_FORMAT, "YYYY-MM-DD HH:mm:ss"], "id", true);
    if (!parsed.isValid()) return null;

    const base = parsed.toDate();
    const parts = getDateTimeParts(base, timeZone);
    const utcGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));

    const targetParts = {
        year: parsed.year(),
        month: parsed.month() + 1,
        day: parsed.date(),
        hour: parsed.hour(),
        minute: parsed.minute(),
        second: parsed.second(),
    } satisfies LocalDateParts;

    const guessParts = getDateTimeParts(utcGuess, timeZone);
    const targetUtc = Date.UTC(
        targetParts.year,
        targetParts.month - 1,
        targetParts.day,
        targetParts.hour,
        targetParts.minute,
        targetParts.second
    );
    const guessUtc = Date.UTC(
        guessParts.year,
        guessParts.month - 1,
        guessParts.day,
        guessParts.hour,
        guessParts.minute,
        guessParts.second
    );
    const offsetMs = guessUtc - targetUtc;

    return new Date(utcGuess.getTime() - offsetMs);
}
