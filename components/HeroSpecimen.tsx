"use client";

import { useState } from "react";
import type { UiLang } from "@/lib/i18n";
import type { Box, ShowcaseResult } from "@/lib/types";
import styles from "./Overview.module.css";

const COPY = {
  en: {
    cell: "Table cell", head: "Header cell", row: "row", col: "column",
    hint: "Point at any cell on the page · {n} cells, each with its own box", table: "Table · {r} rows × {c} columns", open: "Open this page",
  },
  ar: {
    cell: "خلية جدول", head: "خلية عنوان", row: "الصف", col: "العمود",
    hint: "أشر إلى أي خلية في الصفحة · {n} خلية لكل منها موضعها", table: "جدول · {r} صفاً × {c} أعمدة", open: "افتح هذه الصفحة",
  },
};
const fill = (s: string, v: Record<string, number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));
/** a box (0–1000 page units) as a position on the page image */
const place = (b: Box) => ({ left: `${b.x0 / 10}%`, top: `${b.y0 / 10}%`, width: `${(b.x1 - b.x0) / 10}%`, height: `${(b.y1 - b.y0) / 10}%` });

/** The hero's real page, cropped to its table. Every cell DocAI found is a target: point at one and the card under the
 * page shows the text DocAI returned for it. */
export default function HeroSpecimen({ lang, result, href }: { lang: UiLang; result: ShowcaseResult; href: string }) {
  const c = COPY[lang];
  const table = result.segments.find((s) => s.type === "table" && s.box && s.cells?.length && s.table);
  const cells = table?.cells?.filter((x) => x.text.trim()) ?? [];
  // start on the longest cell of the first body row: the one that shows the most
  const firstRow = cells.find((x) => !x.header)?.row;
  const body = cells.filter((x) => x.row === firstRow);
  const start = body.length ? body.reduce((a, b) => (b.text.length > a.text.length ? b : a)) : cells[0];
  const [picked, setPicked] = useState(start);
  if (!table || !picked) return null;

  const rows = table.table!.rows;
  const cols = rows[0]?.length ?? 0;
  // the window onto the page: the table, with a little room above and some below for the card to overlap
  const y0 = Math.max(0, table.box!.y0 - 12);
  const y1 = Math.min(1000, table.box!.y1 + 56);
  const span = y1 - y0;

  return (
    <div className={styles.spec}>
      <div className={styles.crop} style={{ aspectRatio: result.page.width / ((result.page.height * span) / 1000) }}>
        <div className={styles.pg} style={{ top: `${-(y0 / span) * 100}%`, height: `${(1000 / span) * 100}%` }}>
          <img src={result.page.image} alt={`${result.categoryLabel} · ${result.subCategoryLabel}`} />
          <i className={styles.tbox} style={place(table.box!)} aria-hidden="true" />
          {cells.map((x) => (
            <button
              type="button"
              key={`${x.row}-${x.col}`}
              className={styles.hit}
              aria-label={x.text}
              aria-pressed={x === picked}
              onMouseEnter={() => setPicked(x)}
              onFocus={() => setPicked(x)}
              onClick={() => setPicked(x)}
              style={place(x.box)}
            />
          ))}
        </div>
      </div>

      <div className={styles.callout} aria-live="polite">
        <p className={styles.calloutKind}>
          {/* the page reads right to left: its first column is the rightmost */}
          {picked.header ? c.head : c.cell} · {c.row} {picked.row + 1} · {c.col} {cols - picked.col}
        </p>
        <p className={styles.calloutText} lang="ar" dir="rtl">{picked.text}</p>
      </div>

      <p className={styles.hint}>{fill(c.hint, { n: cells.length })}</p>
      <div className={styles.specMeta}>
        <span>{fill(c.table, { r: rows.length, c: cols })}</span>
        <a href={href}>
          {c.open} <span aria-hidden="true">{lang === "ar" ? "←" : "→"}</span>
        </a>
      </div>
    </div>
  );
}
