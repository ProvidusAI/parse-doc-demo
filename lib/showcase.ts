import type { Box } from "./types";

export function nextIndex(i: number, n: number, dir: 1 | -1): number {
  return (((i + dir) % n) + n) % n;
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
