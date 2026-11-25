/**
 * The leaderboard. SAMPLE DATA: every score below is a placeholder that shows how results will be presented, and every
 * system but DocAI is fictional. Replace SYSTEMS with measured results (same shape) when they exist; the page reads
 * nothing else.
 */

export const METRICS = ["text", "tables", "order", "grounding"] as const;
export type Metric = (typeof METRICS)[number];
export type DocLang = "ar" | "en";
export type SortKey = "overall" | Metric;
export type Kind = "ours" | "api" | "open" | "parser" | "classic";

export interface System {
  id: string;
  name: string;
  /** the name on the Arabic site (DocAI keeps its own) */
  nameAr: string;
  kind: Kind;
  /** 0–100, higher is better, per document language */
  scores: Record<DocLang, Record<Metric, number>>;
  /** ± margin on the overall score, per document language */
  ci: Record<DocLang, number>;
}

/** pages per language the (sample) scores are taken over */
export const PAGES_PER_LANG = 300;

const s = (text: number, tables: number, order: number, grounding: number) => ({ text, tables, order, grounding });

export const SYSTEMS: System[] = [
  { id: "docai", name: "DocAI", nameAr: "DocAI", kind: "ours", scores: { ar: s(88.4, 71.2, 83.5, 90.1), en: s(91.0, 74.5, 86.0, 89.0) }, ci: { ar: 1.2, en: 1.1 } },
  { id: "a", name: "Sample vision-language model A", nameAr: "نموذج رؤية ولغة تجريبي A", kind: "api", scores: { ar: s(86.9, 79.8, 80.2, 84.6), en: s(95.2, 86.1, 90.4, 82.0) }, ci: { ar: 1.3, en: 1.0 } },
  { id: "b", name: "Sample vision-language model B", nameAr: "نموذج رؤية ولغة تجريبي B", kind: "api", scores: { ar: s(81.5, 72.4, 77.9, 80.3), en: s(93.1, 82.7, 88.2, 80.1) }, ci: { ar: 1.4, en: 1.1 } },
  { id: "c", name: "Sample open model C", nameAr: "نموذج مفتوح تجريبي C", kind: "open", scores: { ar: s(76.2, 64.8, 72.5, 75.0), en: s(90.4, 77.3, 84.1, 78.2) }, ci: { ar: 1.6, en: 1.2 } },
  { id: "d", name: "Sample document parser D", nameAr: "محلّل مستندات تجريبي D", kind: "parser", scores: { ar: s(72.8, 68.9, 74.1, 86.2), en: s(88.7, 80.5, 85.3, 88.4) }, ci: { ar: 1.5, en: 1.1 } },
  { id: "e", name: "Sample open OCR model E", nameAr: "نموذج تعرّف ضوئي مفتوح تجريبي E", kind: "open", scores: { ar: s(69.4, 52.1, 66.0, 79.5), en: s(86.2, 61.4, 78.8, 81.0) }, ci: { ar: 1.7, en: 1.3 } },
  { id: "f", name: "Sample classic OCR engine F", nameAr: "محرك تعرّف ضوئي تقليدي تجريبي F", kind: "classic", scores: { ar: s(58.7, 31.5, 55.2, 70.4), en: s(82.1, 40.2, 70.5, 76.3) }, ci: { ar: 1.9, en: 1.4 } },
];

/** The overall score: the plain mean of the four task scores (the formula the page states under the table). */
export function overall(sys: System, lang: DocLang): number {
  const v = METRICS.map((m) => sys.scores[lang][m]);
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
}

export interface Row {
  system: System;
  overall: number;
  ci: number;
  /** 1 + the number of systems clearly ahead (their whole margin above this one's) */
  rank: number;
  /** another system shares this rank */
  tied: boolean;
}

/** Rows best first by `by`. Ranks come from the overall score, and systems whose margins overlap share a rank. */
export function ranked(systems: System[], lang: DocLang, by: SortKey): Row[] {
  const rows = systems.map((system) => ({ system, overall: overall(system, lang), ci: system.ci[lang], rank: 0, tied: false }));
  for (const r of rows) r.rank = 1 + rows.filter((o) => o.overall - o.ci > r.overall + r.ci).length;
  for (const r of rows) r.tied = rows.some((o) => o !== r && o.rank === r.rank);
  const value = (r: Row) => (by === "overall" ? r.overall : r.system.scores[lang][by]);
  return rows.sort((a, b) => value(b) - value(a) || a.rank - b.rank);
}

/** The highest value in a column, to mark it. */
export function best(rows: Row[], lang: DocLang, by: SortKey): number {
  return Math.max(...rows.map((r) => (by === "overall" ? r.overall : r.system.scores[lang][by])));
}
