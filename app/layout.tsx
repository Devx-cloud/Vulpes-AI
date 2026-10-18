import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { APP_NAME } from "@/lib/brand";
import "./globals.css";

// Fraunces: judul dan nama merek (serif hangat). Plus Jakarta Sans: teks UI (font buatan Indonesia).
// JetBrains Mono: label teknis, id model, dan kode.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
  display: "swap",
});
const ui = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const code = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Vulpes, AI rubah merah: satu URL dan satu token untuk banyak key.",
};

export const viewport: Viewport = {
  themeColor: "#121011",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${display.variable} ${ui.variable} ${code.variable}`}>
      <body>{children}</body>
    </html>
  );
}
