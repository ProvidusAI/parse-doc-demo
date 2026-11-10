import fs from "node:fs";
import { loadManifest } from "./manifest";
import { boxToPercent, filterPages, hasArabic, nextIndex } from "./showcase";
import { STAGES, t } from "./i18n";
import type { PageSummary } from "./types";

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
    expect(t("ar", "stage.upload")).not.toBe("");
    expect(t("ar", "stage.upload")).not.toBe(t("en", "stage.upload"));
  });
  test("fills variables", () => {
    expect(t("en", "stepOf", { n: 3 })).toBe("Step 3 of 7");
  });
  test("seven stages", () => {
    expect(STAGES).toHaveLength(7);
  });
});

describe("loadManifest", () => {
  afterEach(() => vi.restoreAllMocks());
  test("missing file gives empty manifest", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(loadManifest()).toEqual({ generatedAt: "", wall: [], categories: [] });
  });
});
