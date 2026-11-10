import type { Manifest, ShowcaseResult } from "@/lib/types";

const page = (cat: string, sub: string, label: string) => ({
  id: `${cat}/${sub}`,
  subCategoryLabel: label,
  fileName: `${sub}.png`,
  thumb: `/showcase/${cat}/${sub}/thumb.jpg`,
  result: `/showcase/${cat}/${sub}/result.json`,
});

export const manifest: Manifest = {
  generatedAt: "2026-11-10T00:00:00+00:00",
  wall: ["/showcase/wall/w000.jpg", "/showcase/wall/w001.jpg"],
  categories: [
    {
      key: "financial",
      label: "Financial",
      pages: [
        page("financial", "receipts", "Receipts"),
        page("financial", "invoices", "Invoices"),
        page("financial", "utility_statements", "Utility statements"),
        page("financial", "financial_reports", "Financial reports"),
      ],
    },
    { key: "government", label: "Government", pages: [page("government", "regulations", "Regulations")] },
  ],
};

export const result: ShowcaseResult = {
  id: "financial/receipts",
  category: "financial",
  categoryLabel: "Financial",
  subCategory: "receipts",
  subCategoryLabel: "Receipts",
  lang: "ar-en",
  source: { fileName: "receipts.png", path: "financial/receipts/receipts.png", page: 1 },
  page: { image: "/showcase/financial/receipts/page.jpg", thumb: "/showcase/financial/receipts/thumb.jpg", width: 600, height: 800 },
  upload: {
    fileName: "receipts-abc123-receipts.png",
    mimeType: "image/png",
    bytes: 52011,
    pageCount: 1,
    backend: "glm-ocr",
    ocrModel: "docai-arabic-ocr-e4c",
    ocrEngine: "glm",
    elapsedSeconds: 45.6,
  },
  segments: [
    { id: "seg-1", type: "header", label: "header", text: "TAX INVOICE فاتورة ضريبية", textless: false, box: { page: 1, x0: 300, y0: 20, x1: 700, y1: 60 } },
    { id: "seg-2", type: "table", label: "table", text: "Item · Qty · Product 1 · 10", textless: false, box: { page: 1, x0: 40, y0: 200, x1: 960, y1: 600 } },
    { id: "seg-3", type: "logo", label: "logo", text: "", textless: true, box: { page: 1, x0: 20, y0: 10, x1: 120, y1: 70 } },
  ],
  splitRules: [{ id: "rule-1", name: "Invoice boundary", description: "Start a new record at each TAX INVOICE header." }],
  split: {
    records: [
      { id: "record-1", title: "Tax invoice", documentType: "invoice", startPage: 1, endPage: 1, confidence: "high", boundaryReason: "Single invoice." },
    ],
    qualityStatus: "pass",
    coverage: 1,
  },
  schema: {
    title: "Tax invoice",
    fields: [
      { name: "total_amount", type: "currency", required: true, description: "Invoice total incl. VAT." },
      { name: "supplier_name", type: "string", required: false, description: "Supplier legal name." },
    ],
  },
  extraction: {
    json: { total_amount: "1150.00", supplier_name: "شركة تجريبية" },
    values: [
      { path: "total_amount", value: "1150.00", confidence: 0.97, segmentId: "seg-2", box: { page: 1, x0: 40, y0: 200, x1: 960, y1: 600 } },
      { path: "supplier_name", value: "شركة تجريبية", confidence: null, segmentId: null, box: null },
    ],
  },
  models: { split: "lmstudio/qwen/qwen3-vl-8b", extract: "lmstudio/qwen/qwen3-vl-8b" },
};
