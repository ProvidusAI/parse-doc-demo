import fs from "node:fs";
import path from "node:path";
import type { Box, Manifest, PageSummary } from "./types";

const EMPTY: Manifest = { generatedAt: "", wall: [], categories: [] };

/** Server-only: read the generated manifest at build time. */
export function loadManifest(): Manifest {
  const file = path.join(process.cwd(), "public", "showcase", "manifest.json");
  if (!fs.existsSync(file)) return EMPTY;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Manifest;
}

export function nextIndex(i: number, n: number, dir: 1 | -1): number {
  return (((i + dir) % n) + n) % n;
}

export function filterPages(pages: PageSummary[], q: string): PageSummary[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return pages;
  return pages.filter(
    (p) => p.subCategoryLabel.toLowerCase().includes(needle) || p.fileName.toLowerCase().includes(needle),
  );
}

const clamp = (v: number) => Math.max(0, Math.min(1000, v));
const pct = (v: number) => `${+(v / 10).toFixed(2)}%`;

export function boxToPercent(b: Box) {
  const x0 = clamp(b.x0), y0 = clamp(b.y0), x1 = clamp(b.x1), y1 = clamp(b.y1);
  return { left: pct(x0), top: pct(y0), width: pct(Math.max(0, x1 - x0)), height: pct(Math.max(0, y1 - y0)) };
}

export function hasArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}
