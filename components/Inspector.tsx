"use client";

import { useEffect, useRef, useState } from "react";
import { t, type UiLang } from "@/lib/i18n";
import { pickUnits } from "@/lib/segments";
import { nextIndex } from "@/lib/showcase";
import type { PageSummary, ShowcaseResult } from "@/lib/types";
import styles from "./Inspector.module.css";
import PageView, { type PageBox, type PageCell } from "./PageView";
import StagePanel from "./StagePanel";

interface Props {
  pages: PageSummary[];
  index: number;
  onIndex(i: number): void;
  onClose(): void;
  /** the panel's starting language: the site's */
  lang?: UiLang;
  /** "page": laid out in a page of its own (/dataset/<id>) instead of over the dataset: no veil, no close button, no
   * opening scan, and the page keeps its scrollbar */
  variant?: "modal" | "page";
}

/** how long the opening scan plays before the panel slides in; matches the `scan` keyframe in PageView.module.css */
export const INTRO_MS = 1500;

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

// page | panel split, in % of the width given to the page; equal to start, remembered like DocAI's autoSaveId
const SPLIT_KEY = "providusbench.inspector.split";
const SPLIT_MIN = 25;
const SPLIT_MAX = 70;
const SPLIT_STEP = 2;
const clampSplit = (v: number) => Math.round(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, v)));
const savedSplit = () => {
  try {
    const v = Number(localStorage.getItem(SPLIT_KEY));
    return v ? clampSplit(v) : 50;
  } catch {
    return 50;
  }
};

export default function Inspector({ pages, index, onIndex, onClose, lang: siteLang = "en", variant = "modal" }: Props) {
  const modal = variant === "modal";
  const [loaded, setLoaded] = useState<{ url: string; result: ShowcaseResult } | null>(null);
  const [error, setError] = useState(false);
  const [boxes, setBoxes] = useState<PageBox[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [cell, setCell] = useState<PageBox | null>(null);
  const [reduced] = useState(() => !modal || reducedMotion());
  const [phase, setPhase] = useState<"intro" | "ready">(reduced ? "ready" : "intro");
  const [scanning, setScanning] = useState(!reduced);
  // panel slides in only as the intro ends; on later pages it just appears
  const [entering, setEntering] = useState(false);
  const [lang, setLang] = useState<UiLang>(siteLang);
  const [split, setSplit] = useState(savedSplit);
  const wrapRef = useRef<HTMLDivElement>(null);
  const resizing = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SPLIT_KEY, String(split));
    } catch {
      // storage blocked: the split just isn't remembered
    }
  }, [split]);

  // the divider follows the pointer across the whole pair (pointer capture keeps it during fast drags)
  const splitAt = (clientX: number) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r && r.width > 0) setSplit(clampSplit(((clientX - r.left) / r.width) * 100));
  };
  const onDividerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    resizing.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onDividerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizing.current === e.pointerId) splitAt(e.clientX);
  };
  const onDividerUp = () => {
    resizing.current = null;
  };
  const onDividerKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const next = { ArrowLeft: split - SPLIT_STEP, ArrowRight: split + SPLIT_STEP, Home: SPLIT_MIN, End: SPLIT_MAX }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    e.stopPropagation(); // ← / → here resize; they must not also change the page
    setSplit(clampSplit(next));
  };
  const summary = pages[index];
  const n = pages.length;
  const [scannedId, setScannedId] = useState(summary.id);

  // a new page after the intro replays one scan pass (during the intro the running scan just carries on)
  if (scannedId !== summary.id) {
    setScannedId(summary.id);
    setEntering(false);
    if (phase === "ready" && !reduced) setScanning(true);
  }

  // match on the file we fetched, so a stale response for another page is never shown
  const current = loaded && loaded.url === summary.result ? loaded.result : null;

  // DocAI's cell picking works from both sides: the active table (the picked cell's table, else the
  // hovered one) shows its cells on the page, and a cell picked on either side is picked on both
  const activeTableId = cell ? cell.key.split("#")[0] : highlight;
  const activeTable = current?.segments.find((s) => s.id === activeTableId && s.cells?.length);
  // cells, or row/column bands when only one axis is a guess (DocAI's cellGrid rule)
  const pageCells: PageCell[] = activeTable ? pickUnits(activeTable.id, activeTable.cells!, activeTable.cellGrid) : [];
  const pickCell = (c: PageBox | null) => setCell((cur) => (c && cur?.key !== c.key ? { key: c.key, box: c.box } : null));
  // the scan bar only exists once PageView mounts, so timers start from the load, not the open
  const loadedId = current ? summary.id : null;
  const anyLoaded = loaded !== null;

  // one intro timer from the first page that loads, however many pages are visited meanwhile
  useEffect(() => {
    if (phase !== "intro" || !anyLoaded) return;
    const id = setTimeout(() => {
      setPhase("ready");
      setScanning(false);
      setEntering(true);
    }, INTRO_MS);
    return () => clearTimeout(id);
  }, [phase, anyLoaded]);

  useEffect(() => {
    if (phase !== "ready" || !scanning || !loadedId) return;
    const id = setTimeout(() => setScanning(false), INTRO_MS);
    return () => clearTimeout(id);
  }, [phase, scanning, loadedId]);

  useEffect(() => {
    let live = true;
    setError(false);
    setHighlight(null);
    setCell(null);
    fetch(summary.result)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((r: ShowcaseResult) => live && setLoaded({ url: summary.result, result: r }))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [summary.result]);

  // a file not yet in the CDN cache waits 0.4–1 s for the bucket, so the page image starts with its result.json
  // instead of after it (same folder), and both neighbours load ahead for ← / →
  const near = [index, nextIndex(index, n, 1), nextIndex(index, n, -1)].map((i) => pages[i].result).filter((u, k, a) => a.indexOf(u) === k);
  const nearKey = near.join(" ");
  useEffect(() => {
    nearKey.split(" ").forEach((url, k) => {
      new Image().src = url.replace(/result\.json$/, "page.jpg");
      if (k) fetch(url).catch(() => {}); // the open page's own fetch is the effect above
    });
  }, [nearKey]);

  // stable handlers for the window listener
  const nav = useRef({ onIndex, onClose, index, n });
  nav.current = { onIndex, onClose, index, n };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { onIndex, onClose, index, n } = nav.current;
      if (e.key === "Escape") {
        if (modal) onClose();
      }
      else if (e.key === "ArrowRight") onIndex(nextIndex(index, n, 1));
      else if (e.key === "ArrowLeft") onIndex(nextIndex(index, n, -1));
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    if (modal) {
      document.body.style.overflow = "hidden";
      closeRef.current?.focus();
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [modal]);

  return (
    <div
      className={modal ? styles.modal : styles.page}
      {...(modal ? { role: "dialog", "aria-modal": true } : { role: "region" })}
      aria-label={summary.subCategoryLabel}
    >
      {modal && <div className={styles.veil} onClick={onClose} />}
      {modal && (
        <button ref={closeRef} type="button" className={styles.x} aria-label={t("en", "close")} onClick={onClose}>
          ×
        </button>
      )}
      {modal && <button
        type="button"
        className={`${styles.arr} ${styles.left}`}
        aria-label={t("en", "prev")}
        onClick={() => onIndex(nextIndex(index, n, -1))}
      >
        ‹
      </button>}
      {modal && (
        <button
          type="button"
          className={`${styles.arr} ${styles.right}`}
          aria-label={t("en", "next")}
          onClick={() => onIndex(nextIndex(index, n, 1))}
        >
          ›
        </button>
      )}

      <div
        className={styles.wrap}
        key={summary.id}
        ref={wrapRef}
        data-phase={phase}
        style={{ "--split": split } as React.CSSProperties}
      >
        <div className={styles.pagecol}>
          {current ? (
            <>
              <PageView result={current} boxes={boxes} highlight={highlight} scanning={scanning}
                onHover={setHighlight}
                cells={pageCells}
                pickedCell={cell?.key ?? null}
                onPickCell={pickCell}
              />
              {/* not shown (the page gets the room), but screen readers still hear which page this is */}
              <p className="sr-only">
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
          // DocAI's resize handle (ui/resizable): a thin bar with a grip; drag it or use ← → when focused
          <div
            className={styles.divider}
            role="separator"
            aria-label="Resize page and panel"
            aria-orientation="vertical"
            aria-valuemin={SPLIT_MIN}
            aria-valuemax={SPLIT_MAX}
            aria-valuenow={split}
            tabIndex={0}
            onPointerDown={onDividerDown}
            onPointerMove={onDividerMove}
            onPointerUp={onDividerUp}
            onPointerCancel={onDividerUp}
            onKeyDown={onDividerKey}
          >
            <span className={styles.grip} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <circle cx="9" cy="6" r="1.6" />
                <circle cx="15" cy="6" r="1.6" />
                <circle cx="9" cy="12" r="1.6" />
                <circle cx="15" cy="12" r="1.6" />
                <circle cx="9" cy="18" r="1.6" />
                <circle cx="15" cy="18" r="1.6" />
              </svg>
            </span>
          </div>
        )}
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
                highlight={highlight}
                onCell={(c) => setCell(c)}
                pickedCell={cell?.key ?? null}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
