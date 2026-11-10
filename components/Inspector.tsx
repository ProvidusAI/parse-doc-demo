"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { nextIndex } from "@/lib/showcase";
import type { PageSummary, ShowcaseResult } from "@/lib/types";
import styles from "./Inspector.module.css";
import PageView, { type PageBox } from "./PageView";
import StagePanel from "./StagePanel";

interface Props {
  pages: PageSummary[];
  index: number;
  onIndex(i: number): void;
  onClose(): void;
}

export default function Inspector({ pages, index, onIndex, onClose }: Props) {
  const [result, setResult] = useState<ShowcaseResult | null>(null);
  const [error, setError] = useState(false);
  const [boxes, setBoxes] = useState<PageBox[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const summary = pages[index];
  const n = pages.length;

  useEffect(() => {
    let live = true;
    setError(false);
    setHighlight(null);
    fetch(summary.result)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((r: ShowcaseResult) => live && setResult(r))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [summary.result]);

  // stable handlers for the window listener
  const nav = useRef({ onIndex, onClose, index, n });
  nav.current = { onIndex, onClose, index, n };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { onIndex, onClose, index, n } = nav.current;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex(nextIndex(index, n, 1));
      else if (e.key === "ArrowLeft") onIndex(nextIndex(index, n, -1));
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  const current = result && result.id === summary.id ? result : null;

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label={summary.subCategoryLabel}>
      <div className={styles.veil} onClick={onClose} />
      <button ref={closeRef} type="button" className={styles.x} aria-label={t("en", "close")} onClick={onClose}>
        ×
      </button>
      <button
        type="button"
        className={`${styles.arr} ${styles.left}`}
        aria-label={t("en", "prev")}
        onClick={() => onIndex(nextIndex(index, n, -1))}
      >
        ‹
      </button>
      <button
        type="button"
        className={`${styles.arr} ${styles.right}`}
        aria-label={t("en", "next")}
        onClick={() => onIndex(nextIndex(index, n, 1))}
      >
        ›
      </button>

      <div className={styles.wrap} key={summary.id}>
        <div className={styles.pagecol}>
          {current ? (
            <>
              <PageView result={current} boxes={boxes} highlight={highlight} scanning={scanning} />
              <p className={styles.meta}>
                {current.source.fileName}
                <small>
                  {current.categoryLabel} · {current.subCategoryLabel} · {index + 1} of {n}
                </small>
              </p>
            </>
          ) : (
            <div className={styles.loading}>{error ? "Could not load this page." : ""}</div>
          )}
        </div>
        <div className={styles.panelcol}>
          {current && (
            <StagePanel
              result={current}
              onView={(v) => {
                setBoxes(v.boxes);
                setScanning(v.scanning);
              }}
              onHighlight={setHighlight}
            />
          )}
        </div>
      </div>
    </div>
  );
}
