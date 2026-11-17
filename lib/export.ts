import { hasArabic } from "./showcase";
import type { ExtractedValue, Segment } from "./types";

/** One cell of an export sheet: the text as DocAI read it (a number only when it is a plain number). */
export interface SheetCell {
  value: string | number;
  header: boolean;
}
/** A merged block, 0-based and inclusive. */
export interface Merge {
  top: number;
  left: number;
  bottom: number;
  right: number;
}
/** A rectangle of cells; null marks a slot covered by a merged cell. */
export interface Sheet {
  name: string;
  rows: (SheetCell | null)[][];
  merges: Merge[];
  rtl: boolean;
  freezeHeader: boolean;
}

// a leading zero would be lost as a number, so "007" stays text
const PLAIN_NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?$/;
export const cellValue = (text: string): string | number => (PLAIN_NUMBER.test(text) ? Number(text) : text);

const span = (n: number) => Math.min(Math.max(n || 1, 1), 1000);

interface Source {
  text: string;
  header: boolean;
  rowSpan: number;
  colSpan: number;
}

/** Lays cells out on a grid: covered slots null, every row padded to the widest. */
function layout(name: string, place: (put: (r: number, c: number, cell: Source) => void) => void): Sheet | null {
  const grid: (SheetCell | null | undefined)[][] = [];
  const merges: Merge[] = [];
  let rtl = false;
  place((r, c, cell) => {
    const rs = span(cell.rowSpan);
    const cs = span(cell.colSpan);
    for (let i = 0; i < rs; i++)
      for (let j = 0; j < cs; j++) (grid[r + i] ??= [])[c + j] = i || j ? null : { value: cellValue(cell.text), header: cell.header };
    if (rs > 1 || cs > 1) merges.push({ top: r, left: c, bottom: r + rs - 1, right: c + cs - 1 });
    rtl ||= hasArabic(cell.text);
  });
  if (!grid.length) return null;
  const width = Math.max(...grid.map((row) => row?.length ?? 0));
  const rows = Array.from(grid, (row) => Array.from({ length: width }, (_, c) => row?.[c] ?? null));
  const top = rows[0].filter(Boolean);
  return { name, rows, merges, rtl, freezeHeader: top.length > 0 && top.every((c) => c!.header) };
}

/** A table chunk as a sheet: DocAI's table rows, or its cell grid when that is all there is. */
export function tableSheet(segment: Segment, n: number): Sheet | null {
  const name = `Table ${n}`;
  const rows = segment.table?.rows;
  if (rows?.length) {
    const height = rows.length;
    return layout(name, (put) => {
      const taken: boolean[][] = [];
      rows.forEach((row, r) => {
        let c = 0;
        for (const cell of row) {
          while (taken[r]?.[c]) c++;
          // a row span never runs past the table's last row
          const rs = Math.min(span(cell.rowSpan), height - r);
          const cs = span(cell.colSpan);
          for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) (taken[r + i] ??= [])[c + j] = true;
          put(r, c, { ...cell, rowSpan: rs });
          c += cs;
        }
      });
    });
  }
  if (segment.cells?.length) return layout(name, (put) => segment.cells!.forEach((c) => put(c.row, c.col, c)));
  return null;
}

const ILLEGAL = /[[\]:*?/\\]/g;
const sheetName = (raw: string, used: Set<string>) => {
  const base = (raw.replace(ILLEGAL, "_").trim() || "Sheet").replace(/^./, (ch) => ch.toUpperCase());
  let name = base.slice(0, 31);
  for (let k = 2; used.has(name.toLowerCase()); k++) name = `${base.slice(0, 31 - ` (${k})`.length)} (${k})`;
  used.add(name.toLowerCase());
  return name;
};

const LIST_ITEM = /^([^[]+)\[(\d+)\](?:\.(.+))?$/;
const HEADER = ["Field", "Value", "Confidence (%)"];
const confidence = (c: number | null) => (c == null ? "" : Math.round(c * 100));
const head = (texts: string[]) => texts.map((value) => ({ value, header: true }));
const body = (vals: (string | number)[]) => vals.map((value) => ({ value, header: false }));

/** Extraction as sheets: "Fields" (single fields), then one sheet per list, one row per entry. */
export function recordSheets(values: ExtractedValue[]): Sheet[] {
  const fields: (string | number)[][] = [];
  const lists = new Map<string, { keys: string[]; rows: Map<number, Map<string, string | number>> }>();
  for (const v of values) {
    const m = LIST_ITEM.exec(v.path);
    if (!m) {
      fields.push([v.path, cellValue(v.value ?? ""), confidence(v.confidence)]);
      continue;
    }
    const [, list, index, key = "value"] = m;
    const l = lists.get(list) ?? { keys: [] as string[], rows: new Map() };
    lists.set(list, l);
    if (!l.keys.includes(key)) l.keys.push(key);
    const row = l.rows.get(Number(index)) ?? new Map();
    l.rows.set(Number(index), row.set(key, cellValue(v.value ?? "")));
  }
  const sheet = (name: string, header: string[], rows: (string | number)[][]): Sheet => ({
    name, rows: [head(header), ...rows.map(body)], merges: [], rtl: false, freezeHeader: true,
  });
  const used = new Set<string>();
  return [
    sheet(sheetName("Fields", used), HEADER, fields),
    ...[...lists].map(([list, l]) =>
      sheet(sheetName(list, used), l.keys,
        [...l.rows].sort(([a], [b]) => a - b).map(([, row]) => l.keys.map((k) => row.get(k) ?? ""))),
    ),
  ];
}

/** Extraction as one flat table for CSV: every path, value and confidence. */
export const recordRows = (values: ExtractedValue[]): (string | number)[][] => [
  HEADER,
  ...values.map((v) => [v.path, cellValue(v.value ?? ""), confidence(v.confidence)]),
];

export const sheetRows = (sheet: Sheet): (string | number)[][] => sheet.rows.map((r) => r.map((c) => c?.value ?? ""));

// Excel runs text starting with these as a formula when it opens a CSV
const FORMULA_START = /^[=+@]/;
const csvCell = (v: string | number) => {
  if (typeof v === "number") return String(v);
  const safe = FORMULA_START.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** UTF-8 BOM (so Excel reads Arabic right), comma-separated, CRLF. */
export const toCsv = (rows: (string | number)[][]): string => "﻿" + rows.map((r) => r.map(csvCell).join(",") + "\r\n").join("");

export const exportName = (fileName: string, part: string, ext: "xlsx" | "csv") =>
  `${fileName.replace(/(.)\.[^.]+$/, "$1")}-${part}.${ext}`;
