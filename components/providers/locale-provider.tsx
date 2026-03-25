"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { detectClientLocale, getStoredLocale, persistLocale } from "@/lib/i18n/client";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

type LocaleContextValue = {
    locale: Locale;
    t: Dictionary;
    setLocale: (next: Locale) => void;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
    initialLocale,
    children,
}: {
    initialLocale?: Locale;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

    const applyLocale = useCallback(
        (next: Locale, shouldRefresh = true) => {
            setLocaleState(next);
            persistLocale(next);
            if (shouldRefresh) router.refresh();
        },
        [router]
    );

    useEffect(() => {
        const stored = getStoredLocale();
        if (stored && stored !== locale) {
            applyLocale(stored);
            return;
        }
        const detected = detectClientLocale();
        if (detected !== locale) {
            applyLocale(detected);
        }
    }, [applyLocale, locale]);

    const value = useMemo(
        () => ({ locale, t: getDictionary(locale), setLocale: (next: Locale) => applyLocale(next) }),
        [applyLocale, locale]
    );

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
