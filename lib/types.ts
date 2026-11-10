// Shared contract: generator/normalize.py writes exactly these keys.

/** Integers 0–1000, normalised to the page, top-left origin. */
export type Box = { page: number; x0: number; y0: number; x1: number; y1: number };
export type Lang = "ar-en" | "en";

export interface Segment {
  id: string;
  type: string;
  label: string;
  text: string;
  textless: boolean;
  box: Box | null;
}

export interface SplitRecord {
  id: string;
  title: string;
  documentType: string | null;
  startPage: number;
  endPage: number;
  confidence: "high" | "medium" | "low" | null;
  boundaryReason: string | null;
}

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ExtractedValue {
  path: string;
  value: string;
  confidence: number | null;
  segmentId: string | null;
  box: Box | null;
}

export interface ShowcaseResult {
  id: string; // "financial/receipts"
  category: string;
  categoryLabel: string;
  subCategory: string;
  subCategoryLabel: string;
  lang: Lang;
  source: { fileName: string; path: string; page: number };
  page: { image: string; thumb: string; width: number; height: number };
  upload: {
    fileName: string;
    mimeType: string;
    bytes: number;
    pageCount: number | null;
    backend: string | null;
    ocrModel: string;
    elapsedSeconds: number | null;
  };
  segments: Segment[];
  splitRules: { id: string; name: string; description: string }[] | null;
  split: { records: SplitRecord[]; qualityStatus: "pass" | "review" | "fail"; coverage: number } | null;
  schema: { title: string; fields: SchemaField[] } | null;
  extraction: { json: unknown; values: ExtractedValue[] } | null;
  models: { split: string | null; extract: string | null };
}

export interface PageSummary {
  id: string;
  subCategoryLabel: string;
  fileName: string;
  thumb: string;
  result: string;
}

export interface Category {
  key: string;
  label: string;
  pages: PageSummary[];
}

export interface Manifest {
  generatedAt: string;
  wall: string[];
  categories: Category[];
}
