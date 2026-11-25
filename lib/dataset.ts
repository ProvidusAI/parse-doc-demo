import type { Lang, Manifest, PageSummary } from "./types";

/** Content types the dataset page filters on; the generator writes the same list into each page's `has`. */
export const CONTENT = ["table", "chart", "figure", "formula", "stamp"] as const;
export type Content = (typeof CONTENT)[number];
export const LANGS: Lang[] = ["ar-en", "en"];
export const FORMATS = ["pdf", "image"] as const;
export type Format = (typeof FORMATS)[number];

export interface Filters {
  cat?: string;
  lang?: Lang;
  format?: Format;
  has?: Content[];
}

export interface ListedPage extends PageSummary {
  category: string;
  categoryLabel: string;
}

const tally = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

function all(m: Manifest): ListedPage[] {
  return m.categories.flatMap((c) => c.pages.map((p) => ({ ...p, category: c.key, categoryLabel: c.label })));
}

const matches = (p: ListedPage, f: Filters) =>
  (!f.cat || p.category === f.cat) &&
  (!f.lang || p.lang === f.lang) &&
  (!f.format || p.format === f.format) &&
  (f.has ?? []).every((h) => p.has?.includes(h));

export function filterPages(m: Manifest, f: Filters): ListedPage[] {
  return all(m).filter((p) => matches(p, f));
}

/** The whole dataset in numbers, for the overview and the methodology page. */
export function datasetStats(m: Manifest) {
  const pages = all(m);
  const lang = tally(LANGS);
  const format = tally(FORMATS);
  const has = tally(CONTENT);
  for (const p of pages) {
    if (p.lang) lang[p.lang]++;
    if (p.format) format[p.format]++;
    for (const h of p.has ?? []) if (h in has) has[h as Content]++;
  }
  return {
    pages: pages.length,
    categories: m.categories.length,
    types: new Set(pages.map((p) => p.subCategoryLabel)).size,
    lang,
    format,
    has,
    byCategory: m.categories.map((c) => ({ key: c.key, label: c.label, n: c.pages.length })),
  };
}

/** For each filter option, how many pages it would show with the other filters kept (its own facet ignored, except
 * content, where options add up: "tables" and "stamps" means both). */
export function facetCounts(m: Manifest, f: Filters) {
  const pages = all(m);
  const count = (g: Filters, key: (p: ListedPage) => string | undefined, keys: string[]) => {
    const out = Object.fromEntries(keys.map((k) => [k, 0]));
    for (const p of pages) if (matches(p, g)) { const k = key(p); if (k !== undefined && k in out) out[k]++; }
    return out;
  };
  const has = tally(CONTENT);
  for (const c of CONTENT) has[c] = pages.filter((p) => matches(p, { ...f, has: [...new Set([...(f.has ?? []), c])] })).length;
  return {
    cat: count({ ...f, cat: undefined }, (p) => p.category, m.categories.map((c) => c.key)),
    lang: count({ ...f, lang: undefined }, (p) => p.lang, LANGS) as Record<Lang, number>,
    format: count({ ...f, format: undefined }, (p) => p.format, [...FORMATS]) as Record<Format, number>,
    has,
  };
}

export function parseFilters(q: URLSearchParams): Filters {
  const f: Filters = {};
  const cat = q.get("cat");
  if (cat) f.cat = cat;
  const lang = q.get("lang");
  if (lang && (LANGS as string[]).includes(lang)) f.lang = lang as Lang;
  const format = q.get("format");
  if (format && (FORMATS as readonly string[]).includes(format)) f.format = format as Format;
  const has = (q.get("has") ?? "").split(",").filter((h): h is Content => (CONTENT as readonly string[]).includes(h));
  if (has.length) f.has = has;
  return f;
}

export function filtersToQuery(f: Filters): string {
  const q = new URLSearchParams();
  if (f.cat) q.set("cat", f.cat);
  if (f.lang) q.set("lang", f.lang);
  if (f.format) q.set("format", f.format);
  if (f.has?.length) q.set("has", f.has.join(","));
  return q.toString();
}
