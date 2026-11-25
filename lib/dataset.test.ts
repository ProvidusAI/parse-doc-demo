import { CONTENT, datasetStats, facetCounts, filterPages, parseFilters, filtersToQuery } from "./dataset";
import type { Manifest, PageSummary } from "./types";

const p = (id: string, sub: string, lang: "ar-en" | "en", format: "pdf" | "image", has: string[] = []): PageSummary => ({
  id, subCategoryLabel: sub, fileName: `${id}.pdf`, thumb: "", result: "", lang, format, has,
});

const m: Manifest = {
  generatedAt: "2026-11-23T00:00:00+00:00",
  categories: [
    { key: "financial", label: "Financial", pages: [
      p("f/1", "Receipts", "ar-en", "image"),
      p("f/2", "Invoices", "ar-en", "pdf", ["table"]),
      p("f/3", "Invoices", "en", "pdf", ["table", "chart"]),
    ] },
    { key: "government", label: "Government", pages: [p("g/1", "Regulations", "ar-en", "pdf", ["stamp", "table"])] },
  ],
};

test("dataset stats count pages, categories, distinct page types, languages, formats and content", () => {
  const s = datasetStats(m);
  expect(s).toMatchObject({ pages: 4, categories: 2, types: 3 });
  expect(s.lang).toEqual({ "ar-en": 3, en: 1 });
  expect(s.format).toEqual({ pdf: 3, image: 1 });
  expect(s.has).toEqual({ table: 3, chart: 1, figure: 0, formula: 0, stamp: 1 });
  expect(s.byCategory).toEqual([{ key: "financial", label: "Financial", n: 3 }, { key: "government", label: "Government", n: 1 }]);
});

test("filters combine: category, language, source and every content type asked for", () => {
  expect(filterPages(m, {}).map((x) => x.id)).toEqual(["f/1", "f/2", "f/3", "g/1"]);
  expect(filterPages(m, { cat: "financial", lang: "ar-en" }).map((x) => x.id)).toEqual(["f/1", "f/2"]);
  expect(filterPages(m, { has: ["table", "chart"] }).map((x) => x.id)).toEqual(["f/3"]);
  expect(filterPages(m, { format: "image" })[0]).toMatchObject({ id: "f/1", category: "financial", categoryLabel: "Financial" });
});

test("each option counts the pages it would show with the other filters kept", () => {
  const c = facetCounts(m, { lang: "ar-en", has: ["table"] });
  expect(c.cat).toEqual({ financial: 1, government: 1 }); // ar-en with a table
  expect(c.lang).toEqual({ "ar-en": 2, en: 1 }); // language ignores its own filter
  expect(c.format).toEqual({ pdf: 2, image: 0 });
  expect(c.has.table).toBe(2);
  expect(c.has.stamp).toBe(1); // stamp on top of table, still ar-en
});

test("pages without facts (an older manifest) still list, and only drop out when filtered", () => {
  const old: Manifest = { generatedAt: "", categories: [{ key: "x", label: "X", pages: [{ id: "x/1", subCategoryLabel: "A", fileName: "", thumb: "", result: "" }] }] };
  expect(filterPages(old, {})).toHaveLength(1);
  expect(filterPages(old, { lang: "en" })).toHaveLength(0);
});

test("filters live in the address, unknown values are dropped", () => {
  const f = parseFilters(new URLSearchParams("cat=financial&lang=ar-en&format=pdf&has=table,stamp,bogus&lang=xx"));
  expect(f).toEqual({ cat: "financial", lang: "ar-en", format: "pdf", has: ["table", "stamp"] });
  expect(filtersToQuery(f)).toBe("cat=financial&lang=ar-en&format=pdf&has=table%2Cstamp");
  expect(filtersToQuery({})).toBe("");
  expect(CONTENT).toEqual(["table", "chart", "figure", "formula", "stamp"]);
});
