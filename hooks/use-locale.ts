import { useContext } from "react";
import { LocaleContext } from "@/components/providers/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";

const fallbackLocale = DEFAULT_LOCALE;
const fallbackDictionary = getDictionary(fallbackLocale);
const fallbackContext = {
    locale: fallbackLocale,
    t: fallbackDictionary,
    setLocale: () => {},
} as const;

export function useLocale() {
    const context = useContext(LocaleContext);
    if (!context) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("useLocale called outside LocaleProvider, fallback locale is used.");
        }
        return fallbackContext;
    }
    return context;
}
