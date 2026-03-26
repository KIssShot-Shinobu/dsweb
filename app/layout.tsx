import type { Metadata, Viewport } from "next";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/dashboard/toast";
import { MantineThemeProvider } from "@/components/providers/mantine-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { getServerLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getDictionary(locale);
  return {
    title: t.meta.title,
    description: t.meta.description,
    manifest: "/favicon/site.webmanifest",
    icons: {
      icon: [
        { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon/favicon.ico" },
      ],
      apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: "/favicon/favicon.ico",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} data-theme="dark" className="dark" suppressHydrationWarning>
      <body
        style={{
          ["--font-geist-sans" as string]: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
          ["--font-geist-mono" as string]: '"Consolas", "SFMono-Regular", "Liberation Mono", monospace',
        }}
        className="antialiased"
      >
        <ThemeProvider>
          <LocaleProvider initialLocale={locale}>
            <MantineThemeProvider>
              <ToastProvider>{children}</ToastProvider>
            </MantineThemeProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
