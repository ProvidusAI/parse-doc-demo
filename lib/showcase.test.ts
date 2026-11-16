import fs from "node:fs";
import { loadManifest } from "./manifest";
import { ALL, boxToPercent, expandForStress, filterPages, hasArabic, nextIndex, pagesFor } from "./showcase";
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
    expect(t("en", "stepOf", { n: 3 })).toBe("Step 3 of 5");
  });
  test("five stages", () => {
    expect(STAGES).toHaveLength(5);
  });
});

describe("loadManifest", () => {
  afterEach(() => vi.restoreAllMocks());
  test("missing file gives empty manifest", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(loadManifest()).toEqual({ generatedAt: "", wall: [], categories: [] });
  });
});

const m: Manifest = {
  generatedAt: "",
  wall: [],
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
