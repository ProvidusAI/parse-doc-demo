import { STAGES, t } from "@/lib/i18n";
import styles from "./Hero.module.css";

interface Props {
  categories: number;
  pages: number;
  progress: number;
  onExplore(): void;
}

export default function Hero({ categories, pages, progress, onExplore }: Props) {
  return (
    <section
      id="top"
      className={styles.hero}
      style={{
        opacity: 1 - progress,
        transform: `translateY(${-progress * 40}px)`,
        pointerEvents: progress > 0.6 ? "none" : undefined,
      }}
      aria-hidden={progress > 0.95 || undefined}
    >
      <div className={styles.inner}>
        <div>
          <h1 className={styles.h1}>
            Document intelligence that reads Arabic
            <span className={`${styles.arLine} ar`} lang="ar" dir="rtl">
              ذكاء المستندات باللغتين العربية والإنجليزية
            </span>
          </h1>
          <p className={styles.lead}>
            Real pages from a bilingual corpus, each run end-to-end through Providus DocAI: layout parsing, OCR,
            grounded chunks, splitting and schema extraction, all on our own models.
          </p>
          <dl className={styles.stats}>
            <div>
              <dd>{categories}</dd>
              <dt>Categories</dt>
            </div>
            <div>
              <dd>{pages}</dd>
              <dt>Document types</dt>
            </div>
            <div>
              <dd>{STAGES.length}</dd>
              <dt>Pipeline stages</dt>
            </div>
            <div>
              <dd className="mono">AR·EN</dd>
              <dt>Mixed-script</dt>
            </div>
          </dl>
          <div className={styles.cta}>
            <button type="button" className="btn btn-dark" onClick={onExplore}>
              Explore the pages
            </button>
            <a className="btn" href="#pipeline">
              How it works
            </a>
            <a className="btn" href="https://providus.ai" target="_blank" rel="noreferrer">
              Talk to us
            </a>
          </div>
        </div>
        <ol className={styles.pipe} id="pipeline" aria-label="Pipeline">
          <li className="lbl">Pipeline</li>
          {STAGES.map((s, i) => (
            <li key={s} style={{ animationDelay: `${0.2 + i * 0.1}s` }} className={i === 0 ? styles.on : undefined}>
              <i>{i + 1}</i>
              {t("en", `stage.${s}`)}
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.scroll} aria-hidden="true">
        <div className={styles.mouse} />
        Scroll to explore the dataset
      </div>
    </section>
  );
}
