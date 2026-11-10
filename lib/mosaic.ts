/** Tile sizing for the ParseBench-style page mosaic. Tiles are 3:4 (page-shaped). */

export const MIN_TILE = 24;
export const MAX_TILE = 240;
/** Thumbnails are rendered 480px wide; the zoom % shown in the toolbar is relative to that. */
export const THUMB_WIDTH = 480;
const RATIO = 4 / 3;

/**
 * Largest tile width that shows all `n` pages inside a `w`×`h` box at once.
 * More pages → smaller tiles and more per row, like parsebench.ai.
 */
export function fitTiles(n: number, w: number, h: number, gap: number): { cols: number; tileW: number } {
  if (w <= 0 || h <= 0) {
    w = 1200;
    h = 700;
  }
  const count = Math.max(1, n);
  // more columns than pages is fine: it just means one short row of capped tiles
  for (let cols = 1; ; cols++) {
    const tileW = (w - gap * (cols - 1)) / cols;
    if (tileW < MIN_TILE) break;
    const rows = Math.ceil(count / cols);
    if (rows * tileW * RATIO + gap * (rows - 1) <= h) {
      const capped = Math.min(Math.floor(tileW), MAX_TILE);
      return { cols: Math.max(1, Math.floor((w + gap) / (capped + gap))), tileW: capped };
    }
  }
  return { cols: Math.max(1, Math.floor((w + gap) / (MIN_TILE + gap))), tileW: MIN_TILE };
}

/** One Ctrl+scroll step: `direction` < 0 zooms in. */
export function zoomTile(tileW: number, direction: number): number {
  const next = direction < 0 ? tileW * 1.15 : tileW / 1.15;
  return Math.round(Math.min(THUMB_WIDTH, Math.max(MIN_TILE, next)));
}
