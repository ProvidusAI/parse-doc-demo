import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Three open-licence fonts: IBM Plex Sans and IBM Plex Sans Arabic share one design across both scripts; JetBrains
// Mono (providus.ai's face) sets numbers, labels and code.
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex" });
const plexAr = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600"], variable: "--font-plex-ar" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "ProvidusBench · Open evaluation of Arabic & English document understanding",
  description:
    "Real Arabic and English pages, every DocAI output in the open, and a transparent method for scoring document AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} ${plexAr.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
