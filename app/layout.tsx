import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/dashboard/toast";
import { MantineThemeProvider } from "@/components/providers/mantine-provider";

export const metadata: Metadata = {
  title: "Duel Standby | Komunitas Gaming untuk Duelist Kompetitif",
  description: "Duel Standby adalah komunitas gaming untuk pemain Duel Links dan Master Duel yang mencari turnamen terstruktur, diskusi strategis, dan pengalaman bermain yang lebih profesional.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className="dark" suppressHydrationWarning>
      <body
        style={{
          ["--font-geist-sans" as string]: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
          ["--font-geist-mono" as string]: '"Consolas", "SFMono-Regular", "Liberation Mono", monospace',
        }}
        className="antialiased"
      >
        <ThemeProvider>
          <MantineThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </MantineThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
