import { benchData, docId, DESIGN_DOCS } from "./bench";
import type { Manifest, PageSummary } from "./types";

const p = (id: string, label: string, lang: "ar-en" | "en", format: "pdf" | "image", has: string[] = []): PageSummary => ({
  id, subCategoryLabel: label, fileName: `${id}.pdf`, thumb: `/showcase/${id}/thumb.jpg`, result: `/showcase/${id}/result.json`, lang, format, has,
});

const m: Manifest = {
  generatedAt: "",
  categories: [
    { key: "financial", label: "Financial", pages: [p("financial/invoices", "Invoices", "ar-en", "pdf", ["table", "stamp"])] },
    { key: "travel_transport", label: "Travel & transport", pages: [p("travel_transport/boarding_passes", "Boarding passes", "en", "image")] },
  ],
};

test("design page names map to page ids, even when the category key has an underscore", () => {
  const keys = ["travel", "travel_transport", "financial"];
  expect(docId("travel_transport_boarding_passes", keys)).toBe("travel_transport/boarding_passes");
  expect(docId("financial_financial_reports", keys)).toBe("financial/financial_reports");
  expect(docId("unknown_page", keys)).toBeNull();
});

test("the homepage's data is the site's page list: counts, languages, sources and contents", () => {
  const d = benchData(m);
  expect(d.base).toBe("");
  expect(d.categories).toEqual([["financial", "Financial"], ["travel_transport", "Travel & transport"]]);
  expect(d.pages).toEqual([
    ["financial/invoices", "Invoices", 0, 0, 0, 1 | 16],
    ["travel_transport/boarding_passes", "Boarding passes", 1, 1, 1, 0],
  ]);
});

test("design pages that aren't on the site are left out, so nothing shows a broken image", () => {
  expect(benchData(m).docs).toEqual(["financial_invoices", "travel_transport_boarding_passes"]);
  expect(DESIGN_DOCS).toHaveLength(51);
});

test("in Arabic, page types and categories use their Arabic names", () => {
  const d = benchData(m, "ar");
  expect(d.categories[0]).toEqual(["financial", "المالية"]);
  expect(d.pages.map((p) => p[0])).toEqual(benchData(m).pages.map((p) => p[0]));
});
