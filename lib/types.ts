// Shared contract: generator/normalize.py writes exactly these keys.

/** Integers 0–1000, normalised to the page, top-left origin. */
export type Box = { page: number; x0: number; y0: number; x1: number; y1: number };
export type Lang = "ar-en" | "en";

export interface TableCell { text: string; header: boolean; rowSpan: number; colSpan: number }

/** One cell of DocAI's per-cell grounding grid, with its own box on the page. */
export interface GroundedCell extends TableCell {
  row: number;
  col: number;
  box: Box;
}

export type CellAxis = "detected" | "estimated";

export interface Segment {
  id: string;
  type: string;
  label: string;
  text: string;
  textless: boolean;
  box: Box | null;
  table?: { rows: TableCell[][] } | null;
  /** DocAI's clickable cell grid; absent when the table wasn't read as a grid */
  cells?: GroundedCell[] | null;
  /** how far to trust the cell boxes, per axis (DocAI's cellGrid) */
  cellGrid?: { rows: CellAxis; cols: CellAxis } | null;
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
    /** engine family DocAI reported for the batch ("glm" | "paddle-vl") */
    ocrEngine: string | null;
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
  /** 160px copy of `thumb` for the grid's small tiles; absent on pages generated before it existed */
  tile?: string;
  result: string;
  /** facts the dataset page filters on (generator page_facts); absent on manifests written before them */
  lang?: Lang;
  /** "pdf", or "image" for photos and scans */
  format?: "pdf" | "image";
  /** content types DocAI found: table, chart, figure, formula, stamp */
  has?: string[];
}

export interface Category {
  key: string;
  label: string;
  pages: PageSummary[];
}

export interface Manifest {
  generatedAt: string;
  categories: Category[];
}
