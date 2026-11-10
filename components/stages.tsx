import { useState } from "react";
import { t, type UiLang } from "@/lib/i18n";
import { hasArabic } from "@/lib/showcase";
import type { ShowcaseResult } from "@/lib/types";
import styles from "./StagePanel.module.css";

export interface StageProps {
  result: ShowcaseResult;
  lang: UiLang;
  onHighlight(key: string | null): void;
}

/** DocAI output text: keeps its own direction inside an LTR or RTL panel. */
export function DocText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span dir="auto" className={`${className} ${hasArabic(text) ? "ar" : ""}`.trim()}>
      {text}
    </span>
  );
}

const TAG_TONE: Record<string, string> = { header: "hd", title: "hd", table: "tb" };

function Tag({ type }: { type: string }) {
  return <span className={`${styles.k} ${styles[TAG_TONE[type] ?? ""] ?? ""}`}>{type.toUpperCase()}</span>;
}

function Missing({ lang }: { lang: UiLang }) {
  return <p className={styles.missing}>{t(lang, "notReturned")}</p>;
}

const stagger = (i: number, ms = 60) => ({ animationDelay: `${i * ms}ms` });

export function UploadStage({ result, lang }: StageProps) {
  const u = result.upload;
  const cells: [Parameters<typeof t>[1], string | null][] = [
    ["upload.file", u.fileName],
    ["upload.type", u.mimeType],
    ["upload.size", `${(u.bytes / 1024).toFixed(1)} KB`],
    ["upload.pages", String(u.pageCount)],
    ["upload.backend", u.backend],
    ["upload.ocrModel", u.ocrModel],
    ["upload.elapsed", u.elapsedSeconds == null ? null : `${u.elapsedSeconds.toFixed(1)} s`],
  ];
  return (
    <>
      <div className={styles.prog}>
        <i />
      </div>
      <ul className={styles.fields}>
        {cells.map(([key, value], i) => (
          <li key={key} className={`${styles.f} ${key === "upload.file" ? styles.wide : ""}`} style={stagger(i)}>
            <span className="lbl">{t(lang, key)}</span>
            {value == null ? <span className={styles.missing}>{t(lang, "notReturned")}</span> : <span className="mono">{value}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}

export function OcrStage({ result, lang }: StageProps) {
  const counts = result.segments.reduce<Record<string, number>>((m, s) => ({ ...m, [s.type]: (m[s.type] ?? 0) + 1 }), {});
  return (
    <>
      <div className={styles.types}>
        {Object.entries(counts).map(([type, n]) => (
          <span key={type} className={styles.typeCount}>
            <Tag type={type} /> ×{n}
          </span>
        ))}
      </div>
      <ul className={styles.rows}>
        {result.segments.map((s, i) => (
          <li key={s.id} className={styles.row} style={stagger(i, 40)}>
            <Tag type={s.type} />
            {s.textless ? <span className={styles.muted}>[{s.label}]</span> : <DocText text={s.text} className={styles.tx} />}
          </li>
        ))}
      </ul>
      {result.segments.length === 0 && <Missing lang={lang} />}
    </>
  );
}

export function ChunksStage({ result, lang, onHighlight }: StageProps) {
  if (result.segments.length === 0) return <Missing lang={lang} />;
  return (
    <ul className={styles.rows}>
      {result.segments.map((s, i) => (
        <li
          key={s.id}
          className={`${styles.row} ${styles.hover}`}
          style={stagger(i, 40)}
          tabIndex={0}
          onMouseEnter={() => onHighlight(s.id)}
          onMouseLeave={() => onHighlight(null)}
          onFocus={() => onHighlight(s.id)}
          onBlur={() => onHighlight(null)}
        >
          <span className={styles.k}>#{i + 1}</span>
          <Tag type={s.type} />
          {s.textless ? <span className={styles.muted}>[{s.label}]</span> : <DocText text={s.text} className={styles.tx} />}
          <span className={styles.pg}>P.{s.box?.page ?? 1}</span>
        </li>
      ))}
    </ul>
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
              {r.documentType && <span className={styles.desc}>{r.documentType}</span>}
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
            <span className="mono">{f.name}</span>
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
                <span className="lbl">{v.path}</span>
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
