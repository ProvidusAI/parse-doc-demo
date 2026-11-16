import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { segmentHex } from "@/lib/segments";
import { boxToPercent } from "@/lib/showcase";
import type { Box, ShowcaseResult } from "@/lib/types";
import styles from "./PageView.module.css";

export interface PageBox {
  key: string;
  box: Box;
  /** element type: colours the box like DocAI */
  type?: string;
  /** corner label, e.g. "3.table" */
  tag?: string;
}

interface Props {
  result: ShowcaseResult;
  boxes: PageBox[];
  highlight: string | null;
  scanning: boolean;
  /** the box under the pointer (smallest one when boxes nest), or null; called only when it changes */
  onHover?(key: string | null): void;
  /** cells of the active table: each one a button on the page (DocAI: hover outlines it, click grounds it) */
  cells?: PageCell[];
  /** key of the picked cell, drawn amber */
  pickedCell?: string | null;
  onPickCell?(cell: PageCell): void;
}

export interface PageCell extends PageBox {
  text: string;
}

const ZOOM = 2.5;
const LENS = 180; // px diameter

// page zoom, same limits as DocAI's viewer (docai-web pdf-citation-panel)
const DEFAULT_ZOOM_PERCENT = 100;
const MIN_ZOOM_PERCENT = 40;
const MAX_ZOOM_PERCENT = 350;
const ZOOM_STEP_PERCENT = 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const icon = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    {d}
  </svg>
);

/** The page image with DocAI's grounding boxes drawn over it (0–1000 coords → %). */
export default function PageView({ result, boxes, highlight, scanning, onHover, cells = [], pickedCell = null, onPickCell }: Props) {
  const { image, width, height } = result.page;
  const [magnify, setMagnify] = useState(false);
  const [lens, setLens] = useState<React.CSSProperties | null>(null);
  const hovered = useRef<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM_PERCENT);
  const viewRef = useRef<HTMLDivElement>(null);
  // the point to keep still while zooming (cursor for Ctrl+scroll, centre for the buttons)
  const anchor = useRef<{ x: number; y: number; from: number } | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);

  const zoomBy = (delta: number, at?: { x: number; y: number }) => {
    const el = viewRef.current;
    setZoom((prev) => {
      const next = clamp(prev + delta, MIN_ZOOM_PERCENT, MAX_ZOOM_PERCENT);
      if (el && next !== prev) {
        const r = el.getBoundingClientRect();
        anchor.current = { x: at ? at.x - r.left : el.clientWidth / 2, y: at ? at.y - r.top : el.clientHeight / 2, from: prev };
      }
      return next;
    });
  };

  // keep the anchored point under the cursor/centre after the page grows or shrinks
  useLayoutEffect(() => {
    const el = viewRef.current;
    const a = anchor.current;
    if (!el || !a) return;
    const ratio = zoom / a.from;
    el.scrollLeft = (el.scrollLeft + a.x) * ratio - a.x;
    el.scrollTop = (el.scrollTop + a.y) * ratio - a.y;
    anchor.current = null;
  }, [zoom]);

  // Ctrl/⌘ + wheel zooms (a native listener, so preventDefault stops the browser's own zoom)
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? ZOOM_STEP_PERCENT : -ZOOM_STEP_PERCENT, { x: e.clientX, y: e.clientY });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // drag to pan once the zoomed page overflows its frame (not from buttons: cells and tools stay clickable)
  const panned = useRef(false); // the click that ends a pan is not a pick
  const onPanStart = (e: React.PointerEvent<HTMLDivElement>) => {
    panned.current = false;
    const el = viewRef.current;
    if (!el || magnify || (e.target as HTMLElement).closest("button")) return;
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
    el.setPointerCapture?.(e.pointerId);
    e.preventDefault(); // a pan, not a text/image selection
  };
  const onPan = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = viewRef.current;
    if (!d || !el || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) d.moved = true;
    el.scrollLeft = d.left - dx;
    el.scrollTop = d.top - dy;
  };
  const onPanEnd = () => {
    panned.current = drag.current?.moved ?? false;
    drag.current = null;
  };

  // the target button puts the page back to normal: 100%, from the top-left
  const reset = () => {
    anchor.current = null;
    setZoom(DEFAULT_ZOOM_PERCENT);
    const el = viewRef.current;
    if (el) {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    }
  };

  const hover = (key: string | null) => {
    if (key === hovered.current) return;
    hovered.current = key;
    onHover?.(key);
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (onHover && r.width > 0 && r.height > 0) {
      const px = (x / r.width) * 1000;
      const py = (y / r.height) * 1000;
      let best: PageBox | null = null;
      for (const b of boxes) {
        const { page, x0, y0, x1, y1 } = b.box;
        if (page !== 1 || px < x0 || px > x1 || py < y0 || py > y1) continue;
        const area = (x1 - x0) * (y1 - y0);
        if (!best || area < (best.box.x1 - best.box.x0) * (best.box.y1 - best.box.y0)) best = b;
      }
      hover(best?.key ?? null);
    }
    if (!magnify) return;
    const half = LENS / 2;
    setLens({
      left: x - half,
      top: y - half,
      backgroundImage: `url("${image}")`,
      backgroundSize: `${r.width * ZOOM}px ${r.height * ZOOM}px`,
      backgroundPosition: `${half - x * ZOOM}px ${half - y * ZOOM}px`,
    });
  };

  return (
    <div className={styles.view} style={{ "--ar": `${width} / ${height}`, "--ratio": width / height } as React.CSSProperties}>
      {/* DocAI's viewer controls, in a bar above the page so they never cover it: zoom out · % · zoom in · locate | magnifier */}
      <div className={styles.tools}>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomBy(-ZOOM_STEP_PERCENT)} disabled={zoom <= MIN_ZOOM_PERCENT}>
          {icon(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M8 11h6" /></>)}
        </button>
        <span className={styles.pct} aria-live="polite">{zoom}%</span>
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomBy(ZOOM_STEP_PERCENT)} disabled={zoom >= MAX_ZOOM_PERCENT}>
          {icon(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M8 11h6M11 8v6" /></>)}
        </button>
        <button type="button" aria-label="Reset zoom" title="Reset zoom (100%)" onClick={reset} disabled={zoom === DEFAULT_ZOOM_PERCENT}>
          {icon(<><path d="M2 12h3M19 12h3M12 2v3M12 19v3" /><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /></>)}
        </button>
        <span className={styles.sep} aria-hidden="true" />
        <button
          type="button"
          className={styles.mag}
          aria-label={t("en", "magnifier")}
          aria-pressed={magnify}
          title={t("en", "magnifier")}
          onClick={() => {
            setMagnify((m) => !m);
            setLens(null);
          }}
        >
          {icon(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></>)}
        </button>
      </div>
    <div className={styles.frame}>
      <div
        ref={viewRef}
        className={`${styles.viewport} ${zoom > 100 ? styles.pannable : ""}`}
        onPointerDown={onPanStart}
        onPointerMove={onPan}
        onPointerUp={onPanEnd}
        onPointerCancel={onPanEnd}
      >
    <div
      className={`${styles.page} ${scanning ? styles.scanning : ""} ${magnify ? styles.magnify : ""}`}
      style={{ "--zoom": zoom / 100 } as React.CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={() => {
        setLens(null);
        hover(null);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={`${result.subCategoryLabel} page`} draggable={false} />
      {boxes
        .filter((b) => b.box.page === 1)
        .map((b) => (
          <div
            key={b.key}
            data-box={b.key}
            data-hi={b.key === highlight || undefined}
            className={styles.box}
            style={{ ...boxToPercent(b.box), ...(b.type && { "--c": segmentHex(b.type) }) } as React.CSSProperties}
          >
            {b.tag && <span className={styles.tag}>{b.tag}</span>}
          </div>
        ))}
      {/* DocAI's cell-level grounding (pdf-citation-panel): violet outline, darker on hover, amber when picked */}
      {cells
        .filter((c) => c.box.page === 1)
        .map((c) => (
          <button
            key={c.key}
            type="button"
            data-cell={c.key}
            aria-label={`Table cell ${c.text || c.key}`}
            aria-pressed={c.key === pickedCell}
            title={c.text}
            className={styles.cell}
            style={boxToPercent(c.box)}
            onClick={(e) => {
              e.stopPropagation();
              if (panned.current) return;
              onPickCell?.(c);
            }}
          />
        ))}
      <div className={styles.scan} aria-hidden="true" />
      {magnify && lens && <div data-lens className={styles.lens} style={{ ...lens, width: LENS, height: LENS }} aria-hidden="true" />}
    </div>
      </div>
    </div>
    </div>
  );
}
