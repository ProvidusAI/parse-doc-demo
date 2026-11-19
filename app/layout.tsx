import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic, Inter_Tight } from "next/font/google";
import "./globals.css";

// Note: Inter Tight stands in for Overused Grotesk (not on npm); swap to next/font/local when a licensed woff2 exists.
const sans = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500"], variable: "--font-arabic" });

export const metadata: Metadata = {
  title: "ProvidusBench · Document intelligence for Arabic & English",
  description:
    "Real Arabic and English pages run end-to-end through Providus DocAI: parsing, OCR, grounded chunks, splitting and schema extraction.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${arabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
