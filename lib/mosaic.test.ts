import { fitTiles, MAX_TILE, MIN_TILE, zoomTile } from "./mosaic";

const fits = (n: number, w: number, h: number) => {
  const { cols, tileW } = fitTiles(n, w, h, 4);
  const rows = Math.ceil(n / cols);
  return { cols, tileW, rows, width: cols * tileW + (cols - 1) * 4, height: rows * tileW * (4 / 3) + (rows - 1) * 4 };
};

describe("fitTiles", () => {
  test("21 pages: big tiles, all visible, capped at the max size", () => {
    const f = fits(21, 1440, 700);
    expect(f.tileW).toBeLessThanOrEqual(MAX_TILE);
    expect(f.height).toBeLessThanOrEqual(700);
    expect(f.width).toBeLessThanOrEqual(1440);
  });

  test("400 pages: small tiles, many per row, still all visible", () => {
    const f = fits(400, 1440, 700);
    expect(f.cols).toBeGreaterThanOrEqual(25);
    expect(f.tileW).toBeLessThan(60);
    expect(f.height).toBeLessThanOrEqual(700);
    expect(f.width).toBeLessThanOrEqual(1440);
  });

  test("more pages always means smaller (or equal) tiles", () => {
    let prev = Infinity;
    for (const n of [1, 5, 21, 50, 120, 400, 900, 2000]) {
      const { tileW } = fitTiles(n, 1440, 700, 4);
      expect(tileW).toBeLessThanOrEqual(prev);
      prev = tileW;
    }
  });

  test("never below the minimum tile, even for huge sets", () => {
    expect(fitTiles(20000, 800, 400, 4).tileW).toBe(MIN_TILE);
  });

  test("zero-sized container falls back to a sane default", () => {
    expect(fitTiles(21, 0, 0, 4).tileW).toBeGreaterThan(0);
  });
});

describe("zoomTile", () => {
  test("zooming in and out is clamped", () => {
    expect(zoomTile(100, -1)).toBeGreaterThan(100);
    expect(zoomTile(100, 1)).toBeLessThan(100);
    expect(zoomTile(MIN_TILE, 1)).toBe(MIN_TILE);
    expect(zoomTile(480, -1)).toBe(480);
  });
});

test("fitTiles never returns more columns than pages", () => {
  expect(fitTiles(4, 1900, 750, 4).cols).toBe(4);
  expect(fitTiles(1, 1900, 750, 4).cols).toBe(1);
});
