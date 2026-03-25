"use client";

import type { ReactNode } from "react";
import { MantineProvider, createTheme } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { useTheme } from "@/context/ThemeContext";
import { useLocale } from "@/hooks/use-locale";

const mantineTheme = createTheme({
    fontFamily: "var(--font-geist-sans)",
    headings: { fontFamily: "var(--font-geist-sans)" },
});

export function MantineThemeProvider({ children }: { children: ReactNode }) {
    const { theme } = useTheme();
    const { locale } = useLocale();

    return (
        <MantineProvider theme={mantineTheme} forceColorScheme={theme} defaultColorScheme="dark">
            <DatesProvider
                settings={{
                    locale: locale === "en" ? "en" : "id",
                    firstDayOfWeek: 1,
                    weekendDays: [0, 6],
                }}
            >
                {children}
            </DatesProvider>
        </MantineProvider>
    );
}
