import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

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
    <html lang="en">
      <body
        style={{
          ["--font-geist-sans" as string]: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
          ["--font-geist-mono" as string]: '"Consolas", "SFMono-Regular", "Liberation Mono", monospace',
        }}
        className="antialiased"
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
