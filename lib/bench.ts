import { categoryLabel, pageLabel, type UiLang } from "./i18n";
import type { Manifest } from "./types";

/** What the new homepage's script needs, built from the site's own page list so no figure can drift from the data.
 * Pages are compact rows for the gallery: [id, page type, category index, lang (0 Arabic or bilingual, 1 English),
 * source (0 PDF, 1 photo or scan), contains (bits: 1 tables, 2 figures, 4 charts, 8 formulas, 16 stamps)]. */
export interface BenchData {
  /** prefix for page links and thumbnails; "" = this site */
  base: string;
  categories: [key: string, label: string][];
  pages: [id: string, sub: string, cat: number, lang: 0 | 1, fmt: 0 | 1, has: number][];
  /** pages for the hero band, the category explorer and the marquee, by the design's name (category_subtype) */
  docs: string[];
}

const HAS: Record<string, number> = { table: 1, figure: 2, chart: 4, formula: 8, stamp: 16 };

/** The pages the design picked (file names in its assets/docs), in its order. Each is `<category>_<subtype>`. */
export const DESIGN_DOCS = [
  "financial_invoices", "government_official_notices", "research_research_papers", "media_newspapers",
  "financial_financial_reports", "legal_laws", "travel_transport_boarding_passes", "educational_06-arabic",
  "government_regulations", "statistical_statistical_reports", "health_06-arabic", "manufacturing_01-eng",
  "financial_receipts", "media_magazines", "business_proposals", "municipality_10-arabic",
  "government_tender_documents", "postal_05-arabic", "chemical_02-eng", "administrative_letters",
  "financial_utility_statements", "sports_06-arabic", "marine_03-eng", "educational_course_materials",
  "government_applications_and_forms", "media_advertisements", "travel_transport_transport_tickets", "manufacturing_11-arabic",
  "health_02-eng", "municipality_01-eng", "chemical_06-arabic", "postal_01-eng",
  "educational_05-eng", "marine_08-arabic", "sports_01-eng", "travel_transport_travel_itineraries",
  "manufacturing_02-eng", "health_07-arabic", "municipality_11-arabic", "educational_07-arabic",
  "chemical_01-eng", "postal_06-arabic", "sports_12-eng", "manufacturing_12-arabic",
  "marine_02-eng", "municipality_02-eng", "postal_02-eng", "educational_08-arabic",
  "manufacturing_03-eng", "sports_02-eng", "other_other",
];

/** "travel_transport_boarding_passes" → "travel_transport/boarding_passes", using the real category keys. */
export function docId(name: string, keys: string[]): string | null {
  const key = [...keys].sort((a, b) => b.length - a.length).find((k) => name.startsWith(`${k}_`));
  return key ? `${key}/${name.slice(key.length + 1)}` : null;
}

/** Page types and category names are in `lang`; ids, counts and filters are the same in both. */
export function benchData(m: Manifest, lang: UiLang = "en"): BenchData {
  const keys = m.categories.map((c) => c.key);
  const visible = new Set(m.categories.flatMap((c) => c.pages.map((p) => p.id)));
  return {
    base: "",
    categories: m.categories.map((c) => [c.key, categoryLabel(lang, c.key, c.label)]),
    pages: m.categories.flatMap((c, i) =>
      c.pages.map((p) => [
        p.id,
        pageLabel(lang, p.subCategoryLabel),
        i,
        p.lang === "en" ? 1 : 0,
        p.format === "image" ? 1 : 0,
        (p.has ?? []).reduce((bits, h) => bits | (HAS[h] ?? 0), 0),
      ] as BenchData["pages"][number]),
    ),
    // a page hidden from the site (or renamed) drops out rather than showing a broken image
    docs: DESIGN_DOCS.filter((d) => {
      const id = docId(d, keys);
      return id !== null && visible.has(id);
    }),
  };
}

/** A design page's thumbnail on this site. */
export const docThumb = (name: string, keys: string[]) => `/showcase/${docId(name, keys)}/thumb.jpg`;
