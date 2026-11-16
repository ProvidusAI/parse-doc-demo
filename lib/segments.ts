import type { Box, GroundedCell, Segment } from "./types";

/** DocAI's element-type colours (docai-web lib/segment-colors.ts), so pages read the same as in the app. */
const SEGMENT_HEX: Record<string, string> = {
  text: "#3b82f6",
  title: "#ef4444",
  table: "#f97316",
  figure: "#22c55e",
  header: "#6366f1",
  footer: "#eab308",
  page_number: "#84cc16",
  logo: "#06b6d4",
  stamp: "#d946ef",
  signature: "#ec4899",
  caption: "#a3a3a3",
  chart: "#a3a3a3",
  formula: "#a3a3a3",
  code: "#a3a3a3",
  decoration: "#a3a3a3",
  other: "#a3a3a3",
};

const known = (type: string) => (Object.hasOwn(SEGMENT_HEX, type) ? type : "other");

export const segmentHex = (type: string) => SEGMENT_HEX[known(type)];

/** Corner tag on a page box: chunk number and wire type, e.g. "9.figure". */
export const segmentTag = (n: number, type: string) => `${n}.${known(type)}`;

/** What a click picks on a table: a cell, or a whole row / column band when the other axis is a guess. */
export interface PickUnit {
  key: string;
  box: Box;
  text: string;
  kind: "cell" | "row" | "column";
}

type Grid = Segment["cellGrid"];
// DocAI's parsing docs: draw a single cell only when its columns were detected, else the row band;
// rows follow the same rule. When both axes are a uniform split, there is nothing honest to draw.
const pickKind = (g: Grid): PickUnit["kind"] | null =>
  g?.cols === "estimated" ? (g.rows === "estimated" ? null : "row") : g?.rows === "estimated" ? "column" : "cell";

/** The pick key a cell belongs to (`<seg>#r1c0`, `<seg>#r1` or `<seg>#c0`), or null when nothing is pickable. */
export function pickKey(segmentId: string, c: GroundedCell, grid: Grid): string | null {
  const kind = pickKind(grid);
  if (!kind) return null;
  return `${segmentId}#${kind === "cell" ? `r${c.row}c${c.col}` : kind === "row" ? `r${c.row}` : `c${c.col}`}`;
}

/** The table's pickable units, in reading order; a band's box spans all its cells. */
export function pickUnits(segmentId: string, cells: GroundedCell[], grid: Grid): PickUnit[] {
  const kind = pickKind(grid);
  if (!kind) return [];
  const units = new Map<string, PickUnit & { texts: string[] }>();
  for (const c of cells) {
    const key = pickKey(segmentId, c, grid)!;
    const u = units.get(key);
    if (!u) {
      units.set(key, { key, box: { ...c.box }, text: "", kind, texts: [c.text] });
      continue;
    }
    u.box = { page: u.box.page, x0: Math.min(u.box.x0, c.box.x0), y0: Math.min(u.box.y0, c.box.y0), x1: Math.max(u.box.x1, c.box.x1), y1: Math.max(u.box.y1, c.box.y1) };
    u.texts.push(c.text);
  }
  return [...units.values()].map(({ texts, ...u }) => ({ ...u, text: texts.filter(Boolean).join(" · ") }));
}
