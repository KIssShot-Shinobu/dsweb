"use client";

import type { ReactNode } from "react";
import { MantineProvider, createTheme } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { useTheme } from "@/context/ThemeContext";

const mantineTheme = createTheme({
    fontFamily: "var(--font-geist-sans)",
    headings: { fontFamily: "var(--font-geist-sans)" },
});

export function MantineThemeProvider({ children }: { children: ReactNode }) {
    const { theme } = useTheme();

    return (
        <MantineProvider theme={mantineTheme} forceColorScheme={theme} defaultColorScheme="dark">
            <DatesProvider
                settings={{
                    locale: "id",
                    firstDayOfWeek: 1,
                    weekendDays: [0, 6],
                }}
            >
                {children}
            </DatesProvider>
        </MantineProvider>
    );
}
