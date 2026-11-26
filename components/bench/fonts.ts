import { Geist, Geist_Mono } from "next/font/google";

/** The new design's faces; Arabic text falls back to the site's IBM Plex Sans Arabic (bench.css, [dir="rtl"]). */
export const geist = Geist({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-geist" });
export const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-geist-mono" });
