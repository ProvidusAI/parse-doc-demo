import { categoryLabel, pageLabel } from "./i18n";
import { landingLang, localePath, pageHref, splitLang } from "./locale";

test("visitors from the GCC land on the Arabic site", () => {
  for (const c of ["SA", "AE", "QA", "KW", "BH", "OM"]) expect(landingLang(c, undefined)).toBe("ar");
});

test("everyone else, or an unknown country, gets English", () => {
  expect(landingLang("PK", undefined)).toBe("en");
  expect(landingLang("GB", undefined)).toBe("en");
  expect(landingLang(null, undefined)).toBe("en");
});

test("a language picked in the nav wins over the country", () => {
  expect(landingLang("SA", "en")).toBe("en");
  expect(landingLang("GB", "ar")).toBe("ar");
  expect(landingLang("SA", "fr")).toBe("ar"); // unknown values are ignored
});

test("category names in Arabic, English for any category without one", () => {
  expect(categoryLabel("ar", "financial", "Financial")).toBe("المالية");
  expect(categoryLabel("ar", "brand_new", "Brand new")).toBe("Brand new");
  expect(categoryLabel("en", "financial", "Financial")).toBe("Financial");
});

test("page type names in Arabic, English for any type without one", () => {
  expect(pageLabel("ar", "Receipts")).toBe("إيصالات");
  expect(pageLabel("ar", "A type added later")).toBe("A type added later");
  expect(pageLabel("en", "Receipts")).toBe("Receipts");
});

test("every page has the same address in both languages, Arabic under /ar", () => {
  expect(localePath("en", "/")).toBe("/");
  expect(localePath("ar", "/")).toBe("/ar");
  expect(localePath("ar", "/dataset")).toBe("/ar/dataset");
  expect(localePath("en", "/methodology")).toBe("/methodology");
});

test("the language and site path are read back from an address", () => {
  expect(splitLang("/")).toEqual({ lang: "en", path: "/" });
  expect(splitLang("/ar")).toEqual({ lang: "ar", path: "/" });
  expect(splitLang("/ar/dataset/e4c/x_p1")).toEqual({ lang: "ar", path: "/dataset/e4c/x_p1" });
  expect(splitLang("/arabic-page")).toEqual({ lang: "en", path: "/arabic-page" });
});

test("each dataset page has its own address", () => {
  expect(pageHref("en", "e4c/198_official_notices_82_p6")).toBe("/dataset/e4c/198_official_notices_82_p6");
  expect(pageHref("ar", "financial/receipts")).toBe("/ar/dataset/financial/receipts");
});
