import { useEffect, useRef, useState } from "react";
import { t, type UiLang } from "@/lib/i18n";
import { segmentHex } from "@/lib/segments";
import { hasArabic } from "@/lib/showcase";
import type { GroundedCell, Segment, ShowcaseResult } from "@/lib/types";
import type { PageBox } from "./PageView";
import styles from "./StagePanel.module.css";

export interface StageProps {
  result: ShowcaseResult;
  lang: UiLang;
  onHighlight(key: string | null): void;
  highlight?: string | null;
  /** a picked table cell to ground on the page (DocAI's click-a-cell), or null */
  onCell?(cell: PageBox | null): void;
  /** the picked cell's key (`<segment>#r<row>c<col>`), whether it was picked here or on the page */
  pickedCell?: string | null;
}

/** DocAI output text: keeps its own direction inside an LTR or RTL panel. */
export function DocText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span dir="auto" className={`${className} ${hasArabic(text) ? "ar" : ""}`.trim()}>
      {text}
    </span>
  );
}

/** Element type chip in DocAI's colour for that type, matching its box on the page. */
function Tag({ type }: { type: string }) {
  return (
    <span className={`${styles.k} ${styles.typed}`} style={{ "--c": segmentHex(type) } as React.CSSProperties}>
      {type.toUpperCase()}
    </span>
  );
}

function Missing({ lang }: { lang: UiLang }) {
  return <p className={styles.missing}>{t(lang, "notReturned")}</p>;
}

const ENGINE_NAME: Record<string, string> = { glm: "GLM-OCR", "paddle-vl": "PaddleOCR-VL" };

const stagger = (i: number, ms = 60) => ({ animationDelay: `${i * ms}ms` });

function TableGrid({ table }: { table: NonNullable<Segment["table"]> }) {
  const span = (n: number) => Math.min(Math.max(n || 1, 1), 1000);
  return (
    <div className={styles.tableWrap}>
      <table className={styles.grid}>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((c, k) => {
                const Cell = c.header ? "th" : "td";
                return (
                  <Cell key={k} rowSpan={span(c.rowSpan)} colSpan={span(c.colSpan)}>
                    <DocText text={c.text} />
                  </Cell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** DocAI's per-cell id for a picked cell (docai-web cellAsSegment): `<segment>#r<row>c<col>`. */
const cellId = (segmentId: string, c: GroundedCell) => `${segmentId}#r${c.row}c${c.col}`;

/** DocAI's honest note on cell-box accuracy (docai-web cellAccuracyNote); null when both axes are measured. */
function cellNote(s: Segment, lang: UiLang): string | null {
  const g = s.cellGrid ?? { rows: "estimated", cols: "estimated" };
  if (g.rows === "detected" && g.cols === "detected") return null;
  return t(lang, g.rows === "detected" ? "cellNoteCols" : "cellNoteAll");
}

/**
 * DocAI's CellGrid (docai-web doc-parse-panel): every cell of the grounding grid is a button;
 * picking one grounds that cell on the page.
 */
function CellGrid({ segment, cells, activeId, onPick, lang }: {
  segment: Segment;
  cells: GroundedCell[];
  activeId: string | null;
  onPick(c: GroundedCell): void;
  lang: UiLang;
}) {
  const rows: GroundedCell[][] = [];
  for (const c of cells) {
    rows[c.row] ??= [];
    rows[c.row][c.col] = c;
  }
  const span = (n: number) => Math.min(Math.max(n || 1, 1), 1000);
  const note = cellNote(segment, lang);
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.grid}>
          <tbody>
            {Array.from(rows, (row, r) => (
              <tr key={r}>
                {(row ?? []).map((c) => {
                  if (!c) return null;
                  const id = cellId(segment.id, c);
                  const Cell = c.header ? "th" : "td";
                  return (
                    <Cell key={id} rowSpan={span(c.rowSpan)} colSpan={span(c.colSpan)} className={styles.pickCell}>
                      <button
                        type="button"
                        className={styles.pick}
                        aria-pressed={activeId === id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPick(c);
                        }}
                      >
                        <DocText text={c.text || " "} />
                      </button>
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className={styles.cellNote}>{note}</p>}
    </>
  );
}

export function ChunksStage({ result, lang, onHighlight, highlight = null, onCell, pickedCell = null }: StageProps) {
  const cards = useRef<Record<string, HTMLLIElement | null>>({});

  const pickCell = (s: Segment, c: GroundedCell) => {
    const id = cellId(s.id, c);
    onCell?.(pickedCell === id ? null : { key: id, box: c.box }); // clicking the picked cell again clears it
  };

  // a box hovered on the page brings its chunk into view; scroll only the panel body, never the page
  useEffect(() => {
    const el = highlight ? cards.current[highlight] : null;
    const box = el?.closest<HTMLElement>("[data-scroll]");
    if (!el || !box) return;
    const top = el.offsetTop;
    const visible = top >= box.scrollTop && top + el.offsetHeight <= box.scrollTop + box.clientHeight;
    if (!visible) box.scrollTo?.({ top: Math.max(0, top - 12), behavior: "smooth" });
  }, [highlight]);

  const counts = result.segments.reduce<Record<string, number>>((m, s) => ({ ...m, [s.type]: (m[s.type] ?? 0) + 1 }), {});
  const u = result.upload;
  const run: [Parameters<typeof t>[1], string | null][] = [
    ["upload.engine", u.ocrEngine && (ENGINE_NAME[u.ocrEngine] ?? u.ocrEngine)],
    ["upload.ocrModel", u.ocrModel],
    ["upload.elapsed", u.elapsedSeconds == null ? null : `${u.elapsedSeconds.toFixed(1)} s`],
  ];
  return (
    <>
      <ul className={`${styles.fields} ${styles.run}`}>
        {run.map(([key, value], i) => (
          <li key={key} className={styles.f} style={stagger(i)}>
            <span className="lbl">{t(lang, key)}</span>
            {value == null ? <span className={styles.missing}>{t(lang, "notReturned")}</span> : <span className="mono">{value}</span>}
          </li>
        ))}
      </ul>
      <div className={styles.types}>
        {Object.entries(counts).map(([type, n]) => (
          <span key={type} className={styles.typeCount}>
            <Tag type={type} /> ×{n}
          </span>
        ))}
      </div>
      {result.segments.length === 0 && <Missing lang={lang} />}
      <ul className={styles.rows}>
        {result.segments.map((s, i) => (
          <li
            key={s.id}
            ref={(el) => {
              cards.current[s.id] = el;
            }}
            className={`${styles.chunk} ${styles.hover}`}
            data-hi={s.id === highlight || undefined}
            style={stagger(i, 40)}
            tabIndex={0}
            onMouseEnter={() => onHighlight(s.id)}
            onMouseLeave={() => onHighlight(null)}
            onFocus={() => onHighlight(s.id)}
            onBlur={() => onHighlight(null)}
          >
            {/* DocAI-style card: number, type and page on one line, the content full width below */}
            <div className={styles.chead} data-chunk-head>
              <span className={styles.k}>#{i + 1}</span>
              <Tag type={s.type} />
              {s.box && <span className={styles.pg}>P.{s.box.page}</span>}
            </div>
            {s.cells ? (
              <CellGrid segment={s} cells={s.cells} activeId={pickedCell} onPick={(c) => pickCell(s, c)} lang={lang} />
            ) : s.table ? (
              <TableGrid table={s.table} />
            ) : s.textless ? (
              <DocText text={`[${s.label}]`} className={styles.muted} />
            ) : (
              <DocText text={s.text} className={styles.tx} />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export function SplitRulesStage({ result, lang }: StageProps) {
  if (!result.splitRules) return <Missing lang={lang} />;
  return (
    <ul className={styles.rows}>
      {result.splitRules.map((r, i) => (
        <li key={r.id} className={`${styles.row} ${styles.rule}`} style={stagger(i, 80)}>
          <span className={styles.ruleText}>
            <DocText text={r.name} className={styles.strong} />
            <DocText text={r.description} className={styles.desc} />
          </span>
          <span role="switch" aria-checked="true" aria-disabled="true" aria-label={r.name} className={styles.toggle} />
        </li>
      ))}
    </ul>
  );
}

export function SplitResultStage({ result, lang }: StageProps) {
  if (!result.split) return <Missing lang={lang} />;
  return (
    <>
      <p className={styles.quality}>
        <span className="lbl">{t(lang, "quality")}</span>
        <span className={`${styles.pill} ${styles[result.split.qualityStatus]}`}>{result.split.qualityStatus}</span>
      </p>
      <ul className={styles.rows}>
        {result.split.records.map((r, i) => (
          <li key={r.id} className={`${styles.row} ${styles.record}`} style={stagger(i, 80)}>
            <span className={styles.idx}>{String(i + 1).padStart(2, "0")}</span>
            <span className={styles.ruleText}>
              <DocText text={r.title} className={styles.strong} />
              {r.documentType && <DocText text={r.documentType} className={styles.desc} />}
              {r.boundaryReason && <DocText text={r.boundaryReason} className={styles.desc} />}
            </span>
            <span className={styles.recMeta}>
              <span className={styles.pill}>{t(lang, "pagesRange", { a: r.startPage, b: r.endPage })}</span>
              {r.confidence && <span className={styles.conf}>{r.confidence}</span>}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ExtractRulesStage({ result, lang }: StageProps) {
  if (!result.schema) return <Missing lang={lang} />;
  return (
    <ul className={styles.fields}>
      {result.schema.fields.map((f, i) => (
        <li key={f.name} className={styles.f} style={stagger(i)}>
          <span className={styles.fhead}>
            <DocText text={f.name} className="mono" />
            {f.required && <span className={styles.req}>{t(lang, "required")}</span>}
            <span className={styles.k}>{f.type.toUpperCase()}</span>
          </span>
          <DocText text={f.description} className={styles.desc} />
        </li>
      ))}
    </ul>
  );
}

export function ExtractedStage({ result, lang, onHighlight }: StageProps) {
  const [view, setView] = useState<"fields" | "json">("fields");
  if (!result.extraction) return <Missing lang={lang} />;
  return (
    <>
      <div className={styles.seg} role="group">
        <button type="button" aria-pressed={view === "fields"} onClick={() => setView("fields")}>
          {t(lang, "viewFields")}
        </button>
        <button type="button" aria-pressed={view === "json"} onClick={() => setView("json")}>
          {t(lang, "viewJson")}
        </button>
      </div>
      {view === "json" ? (
        <pre className={styles.json} dir="auto">
          {JSON.stringify(result.extraction.json, null, 2)}
        </pre>
      ) : (
        <ul className={styles.fields}>
          {result.extraction.values.map((v, i) => (
            <li
              key={v.path}
              className={`${styles.f} ${v.box ? styles.hover : ""}`}
              style={stagger(i, 40)}
              onMouseEnter={() => v.box && onHighlight(v.path)}
              onMouseLeave={() => onHighlight(null)}
              onClick={() => v.box && onHighlight(v.path)}
            >
              <span className={styles.fhead}>
                <DocText text={v.path} className="lbl" />
                {v.confidence != null && <b className={styles.ok}>{Math.round(v.confidence * 100)}%</b>}
              </span>
              <DocText text={v.value || "—"} className="mono" />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
