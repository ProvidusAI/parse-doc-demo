"use client";

import { useEffect, useRef, useState } from "react";
import { t, type UiLang } from "@/lib/i18n";
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

/** how long the opening scan plays before the panel slides in; matches the `scan` keyframe in PageView.module.css */
export const INTRO_MS = 1500;

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

export default function Inspector({ pages, index, onIndex, onClose }: Props) {
  const [loaded, setLoaded] = useState<{ url: string; result: ShowcaseResult } | null>(null);
  const [error, setError] = useState(false);
  const [boxes, setBoxes] = useState<PageBox[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [reduced] = useState(reducedMotion);
  const [phase, setPhase] = useState<"intro" | "ready">(reduced ? "ready" : "intro");
  const [scanning, setScanning] = useState(!reduced);
  // panel slides in only as the intro ends; on later pages it just appears
  const [entering, setEntering] = useState(false);
  const [lang, setLang] = useState<UiLang>("en");
  const closeRef = useRef<HTMLButtonElement>(null);
  const summary = pages[index];
  const n = pages.length;
  const [scannedId, setScannedId] = useState(summary.id);

  // a new page after the intro replays one scan pass (during the intro the running scan just carries on)
  if (scannedId !== summary.id) {
    setScannedId(summary.id);
    setEntering(false);
    if (phase === "ready" && !reduced) setScanning(true);
  }

  // one intro timer from opening, however many pages are visited meanwhile
  useEffect(() => {
    if (phase !== "intro") return;
    const id = setTimeout(() => {
      setPhase("ready");
      setScanning(false);
      setEntering(true);
    }, INTRO_MS);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready" || !scanning) return;
    const id = setTimeout(() => setScanning(false), INTRO_MS);
    return () => clearTimeout(id);
  }, [phase, scanning, summary.id]);

  useEffect(() => {
    let live = true;
    setError(false);
    setHighlight(null);
    fetch(summary.result)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((r: ShowcaseResult) => live && setLoaded({ url: summary.result, result: r }))
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

  // match on the file we fetched, so a stale response for another page is never shown
  const current = loaded && loaded.url === summary.result ? loaded.result : null;

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

      <div className={styles.wrap} key={summary.id} data-phase={phase}>
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
        {phase === "ready" && (
          <div className={styles.panelcol} data-enter={entering || undefined}>
            {current && (
              <StagePanel
                result={current}
                lang={lang}
                onLang={setLang}
                onView={(v) => {
                  setBoxes(v.boxes);
                }}
                onHighlight={setHighlight}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
