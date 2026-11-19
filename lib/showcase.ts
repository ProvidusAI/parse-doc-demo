import type { Box, Manifest, PageSummary } from "./types";

/** Where a page file lives. With NEXT_PUBLIC_DATA_URL set (the R2 bucket's public address) a
 * `/showcase/...` path becomes the same path in the bucket; without it, the file on this server. */
export function dataUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_DATA_URL ?? "").replace(/\/+$/, "");
  return base && path.startsWith("/showcase/") ? base + path.slice("/showcase".length) : path;
}

/** Tab key that shows every category at once. */
export const ALL = "all";

export function pagesFor(m: Manifest, key: string): PageSummary[] {
  if (key === ALL) return m.categories.flatMap((c) => c.pages);
  return m.categories.find((c) => c.key === key)?.pages ?? [];
}

/**
 * Load testing only (`?stress=400`): duplicate real pages, in proportion to each category,
 * until the dataset has `n` pages. Copies reuse the same result/thumb files.
 */
export function expandForStress(m: Manifest, n: number): Manifest {
  const flat = m.categories.flatMap((c) => c.pages.map((p) => ({ cat: c.key, p })));
  if (n <= flat.length || flat.length === 0) return m;
  const extra: Record<string, PageSummary[]> = {};
  for (let i = 0; i < n - flat.length; i++) {
    const { cat, p } = flat[i % flat.length];
    (extra[cat] ??= []).push({ ...p, id: `${p.id}~${Math.floor(i / flat.length) + 1}` });
  }
  return { ...m, categories: m.categories.map((c) => ({ ...c, pages: [...c.pages, ...(extra[c.key] ?? [])] })) };
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
