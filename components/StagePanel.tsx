"use client";

import { useEffect, useRef, useState } from "react";
import { STAGES, t, type Stage, type UiLang } from "@/lib/i18n";
import { segmentTag } from "@/lib/segments";
import type { ShowcaseResult } from "@/lib/types";
import type { PageBox } from "./PageView";
import styles from "./StagePanel.module.css";
import {
  ChunksStage,
  ExtractedStage,
  ExtractRulesStage,
  SplitResultStage,
  SplitRulesStage,
  type StageProps,
} from "./stages";

export interface PageViewState {
  boxes: PageBox[];
}

interface Props {
  result: ShowcaseResult;
  /** owned by the Inspector so it survives moving between pages */
  lang: UiLang;
  onLang(lang: UiLang): void;
  onView(view: PageViewState): void;
  onHighlight(key: string | null): void;
  /** the highlighted box/chunk, wherever the hover started (page or panel) */
  highlight?: string | null;
  /** a picked table cell to draw on the page, or null */
  onCell?(cell: PageBox | null): void;
}

const BODY: Record<Stage, (p: StageProps) => React.ReactNode> = {
  chunks: ChunksStage,
  splitRules: SplitRulesStage,
  splitResult: SplitResultStage,
  extractRules: ExtractRulesStage,
  extracted: ExtractedStage,
};

/** Header pill: a count of what DocAI returned for this step (never an invented metric). */
function pill(stage: Stage, r: ShowcaseResult, lang: UiLang): string | null {
  switch (stage) {
    case "chunks":
      return t(lang, "chunks", { n: r.segments.length });
    case "splitRules":
      return r.splitRules && t(lang, "rules", { n: r.splitRules.length });
    case "splitResult":
      return r.split && t(lang, "records", { n: r.split.records.length });
    case "extractRules":
      return r.schema && t(lang, "fields", { n: r.schema.fields.length });
    case "extracted":
      return r.extraction && t(lang, "fields", { n: r.extraction.values.length });
  }
}

/** Only the steps DocAI returned data for, in pipeline order. */
function visibleStages(r: ShowcaseResult): Stage[] {
  const has: Record<Stage, unknown> = {
    chunks: true,
    splitRules: r.splitRules,
    splitResult: r.split,
    extractRules: r.schema,
    extracted: r.extraction,
  };
  return STAGES.filter((s) => has[s]);
}

function viewFor(stage: Stage, r: ShowcaseResult): PageViewState {
  if (stage === "chunks") {
    // coloured by element type, each box tagged "n.type" like DocAI
    return { boxes: r.segments.flatMap((s, i) => (s.box ? [{ key: s.id, box: s.box, type: s.type, tag: segmentTag(i + 1, s.type) }] : [])) };
  }
  if (stage === "extracted") {
    return { boxes: (r.extraction?.values ?? []).flatMap((v) => (v.box ? [{ key: v.path, box: v.box }] : [])) };
  }
  return { boxes: [] };
}

export default function StagePanel({ result, lang, onLang, onView, onHighlight, highlight = null, onCell }: Props) {
  const [step, setStep] = useState(0);
  const [shownId, setShownId] = useState(result.id);
  const stepsRef = useRef<HTMLDivElement>(null);

  if (shownId !== result.id) {
    setShownId(result.id);
    setStep(0);
  }

  const stages = visibleStages(result);
  const stage = stages[step] ?? stages[0];

  useEffect(() => {
    onView(viewFor(stage, result));
    onHighlight(null);
    onCell?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, result]);

  useEffect(() => {
    // scroll only the stepper strip: scrollIntoView would also scroll the panel itself sideways
    const strip = stepsRef.current;
    const el = strip?.children[step] as HTMLElement | undefined;
    if (strip && el) strip.scrollTo?.({ left: el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [step]);

  const Body = BODY[stage];
  const model = stage === "splitRules" || stage === "splitResult" ? result.models.split : stage.startsWith("extract") ? result.models.extract : null;
  const count = pill(stage, result, lang);

  return (
    <section className={styles.panel} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang} aria-label="DocAI pipeline">
      <div className={styles.aur} aria-hidden="true" />
      <header className={styles.ph}>
        <div className={styles.lang} role="group" aria-label={t(lang, "language")}>
          <button type="button" aria-pressed={lang === "en"} onClick={() => onLang("en")}>
            EN
          </button>
          <button type="button" className="ar" lang="ar" aria-pressed={lang === "ar"} onClick={() => onLang("ar")}>
            العربية
          </button>
        </div>
        <p className="lbl">{t(lang, "category")}</p>
        <div className={styles.tagrow}>
          <span className={`${styles.tag} ${styles.dot}`}>{result.categoryLabel}</span>
          <span className={styles.tag}>{result.subCategoryLabel}</span>
        </div>
        <div className={styles.steps} ref={stepsRef}>
          {stages.map((s, k) => (
            <button
              key={s}
              type="button"
              className={`${styles.step} ${k < step ? styles.done : ""}`}
              aria-current={k === step ? "step" : undefined}
              onClick={() => setStep(k)}
            >
              <i>{k < step ? "✓" : k + 1}</i>
              {t(lang, `stage.${s}`)}
            </button>
          ))}
        </div>
      </header>
      <div className={styles.pb} key={`${result.id}-${stage}-${lang}`} data-scroll>
        <div className={styles.ttl}>
          <div>
            <h3>{t(lang, `title.${stage}`)}</h3>
            <p>{t(lang, `sub.${stage}`)}</p>
          </div>
          {count && <span className={styles.pill}>{count}</span>}
        </div>
        <Body result={result} lang={lang} onHighlight={onHighlight} highlight={highlight} onCell={onCell} />
      </div>
      <footer className={styles.pf}>
        <span>
          <span>{t(lang, "stepOf", { n: step + 1, total: stages.length })}</span> · <b>{t(lang, `stage.${stage}`)}</b>
        </span>
        {model && <span dir="ltr">{model.replace(/^lmstudio\//, "")}</span>}
      </footer>
    </section>
  );
}
