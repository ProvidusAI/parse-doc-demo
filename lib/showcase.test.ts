import fs from "node:fs";
import { loadManifest } from "./manifest";
import { ALL, boxToPercent, dataUrl, expandForStress, filterPages, hasArabic, nextIndex, pagesFor } from "./showcase";
import { STAGES, t } from "./i18n";
import type { Manifest, PageSummary } from "./types";

const pages: PageSummary[] = [
  { id: "financial/receipts", subCategoryLabel: "Receipts", fileName: "r.jpg", thumb: "", result: "" },
  { id: "financial/invoices", subCategoryLabel: "Invoices", fileName: "KSA invoice.png", thumb: "", result: "" },
];

describe("nextIndex", () => {
  test("wraps", () => {
    expect(nextIndex(3, 4, 1)).toBe(0);
    expect(nextIndex(0, 4, -1)).toBe(3);
    expect(nextIndex(1, 4, 1)).toBe(2);
  });
  test("wraps single page", () => {
    expect(nextIndex(0, 1, 1)).toBe(0);
    expect(nextIndex(0, 1, -1)).toBe(0);
  });
});

describe("filterPages", () => {
  test("matches label case-insensitively", () => {
    expect(filterPages(pages, "receipt").map((p) => p.id)).toEqual(["financial/receipts"]);
  });
  test("matches file name", () => {
    expect(filterPages(pages, "ksa").map((p) => p.id)).toEqual(["financial/invoices"]);
  });
  test("blank query returns all", () => {
    expect(filterPages(pages, "  ")).toHaveLength(2);
  });
});

test("boxToPercent clamps", () => {
  expect(boxToPercent({ page: 1, x0: -5, y0: 0, x1: 1200, y1: 500 })).toEqual({
    left: "0%",
    top: "0%",
    width: "100%",
    height: "50%",
  });
  expect(boxToPercent({ page: 1, x0: 250, y0: 100, x1: 750, y1: 300 })).toEqual({
    left: "25%",
    top: "10%",
    width: "50%",
    height: "20%",
  });
});

test("hasArabic", () => {
  expect(hasArabic("فاتورة ضريبية")).toBe(true);
  expect(hasArabic("TAX INVOICE")).toBe(false);
});

describe("i18n", () => {
  test("arabic differs from english", () => {
    expect(t("ar", "stage.chunks")).not.toBe("");
    expect(t("ar", "stage.chunks")).not.toBe(t("en", "stage.chunks"));
  });
  test("fills variables", () => {
    expect(t("en", "stepOf", { n: 3, total: 4 })).toBe("Step 3 of 4");
  });
  test("five stages", () => {
    expect(STAGES).toHaveLength(5);
  });
});

const R2 = "https://pub-x.r2.dev";

describe("dataUrl", () => {
  afterEach(() => vi.unstubAllEnvs());
  test("no data URL set: the path on this server, as it is", () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_URL", "");
    expect(dataUrl("/showcase/e4c/a_p1/page.jpg")).toBe("/showcase/e4c/a_p1/page.jpg");
  });
  test("data URL set: the same path in the bucket (no /showcase prefix, no double slash)", () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_URL", `${R2}/`);
    expect(dataUrl("/showcase/e4c/a_p1/page.jpg")).toBe(`${R2}/e4c/a_p1/page.jpg`);
  });
  test("anything outside /showcase/ is left alone", () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_URL", R2);
    expect(dataUrl("/icon.svg")).toBe("/icon.svg");
  });
});

describe("loadManifest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test("from disk: missing file gives empty manifest", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_URL", "");
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(await loadManifest()).toEqual({ generatedAt: "", categories: [] });
  });

  test("from R2: both manifests are fetched, merged, and point at the bucket", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_URL", R2);
    const page = (id: string) => ({ id, subCategoryLabel: id, fileName: "f.jpg", thumb: `/showcase/${id}/thumb.jpg`, result: `/showcase/${id}/result.json` });
    const files: Record<string, Manifest> = {
      [`${R2}/manifest.json`]: { generatedAt: "t", categories: [{ key: "financial", label: "Financial", pages: [page("financial/receipts")] }] },
      [`${R2}/manifest.local.json`]: { generatedAt: "l", categories: [{ key: "financial", label: "Financial", pages: [page("e4c/a_p1")] }] },
    };
    const fetch = vi.fn(async (url: string) => (url in files ? new Response(JSON.stringify(files[url])) : new Response("", { status: 404 })));
    vi.stubGlobal("fetch", fetch);
    const m = await loadManifest();
    expect(m.categories[0].pages.map((p) => [p.thumb, p.result])).toEqual([
      [`${R2}/financial/receipts/thumb.jpg`, `${R2}/financial/receipts/result.json`],
      [`${R2}/e4c/a_p1/thumb.jpg`, `${R2}/e4c/a_p1/result.json`],
    ]);
    vi.unstubAllGlobals();
  });

  test("from R2: no local manifest is fine", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_URL", R2);
    const only: Manifest = { generatedAt: "t", categories: [] };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.endsWith("/manifest.json") ? new Response(JSON.stringify(only)) : new Response("", { status: 404 }))));
    expect(await loadManifest()).toEqual(only);
    vi.unstubAllGlobals();
  });

  test("from R2: a missing main manifest fails the build instead of shipping an empty site", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_URL", R2);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 403 })));
    await expect(loadManifest()).rejects.toThrow(/manifest\.json.*403/);
    vi.unstubAllGlobals();
  });
});

const m: Manifest = {
  generatedAt: "",
  categories: [
    { key: "financial", label: "Financial", pages },
    { key: "legal", label: "Legal", pages: [{ id: "legal/laws", subCategoryLabel: "Laws", fileName: "l.pdf", thumb: "", result: "/r/l.json" }] },
  ],
};

describe("pagesFor", () => {
  test("All flattens every category in order", () => {
    expect(pagesFor(m, ALL).map((p) => p.id)).toEqual(["financial/receipts", "financial/invoices", "legal/laws"]);
  });
  test("a category returns its own pages", () => {
    expect(pagesFor(m, "legal").map((p) => p.id)).toEqual(["legal/laws"]);
  });
  test("unknown key returns nothing", () => {
    expect(pagesFor(m, "nope")).toEqual([]);
  });
});

describe("expandForStress", () => {
  test("duplicates pages up to the requested total, round-robin across categories", () => {
    const big = expandForStress(m, 12);
    const all = pagesFor(big, ALL);
    expect(all).toHaveLength(12);
    expect(new Set(all.map((p) => p.id)).size).toBe(12);
    expect(big.categories.map((c) => c.pages.length)).toEqual([8, 4]);
    expect(all.every((p) => p.result.startsWith("/r/") || p.result === "")).toBe(true);
  });
  test("never shrinks the real data", () => {
    expect(pagesFor(expandForStress(m, 1), ALL)).toHaveLength(3);
  });
});
