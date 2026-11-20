"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fitTiles, zoomTile } from "@/lib/mosaic";
import styles from "./Mosaic.module.css";

export interface MosaicItem {
  id: string;
  label: string; // category
  sub: string; // document type
  thumb: string;
  /** 160px copy of `thumb` (generator TILE_WIDTH): with ~1000 pages on screen the 480px cards alone are ~33 MB */
  tile?: string;
}

interface Props {
  items: MosaicItem[];
  onOpen(id: string): void;
  /** current tile width in px, so the toolbar can show the zoom % */
  onZoom(tileW: number): void;
}

const GAP = 4;
const PAD = 6;
const DRAG_PX = 4;

/**
 * ParseBench-style wall of every page: tiles shrink and rows lengthen as the page count grows so
 * the whole set fits on screen; Ctrl/⌘ + scroll zooms, drag pans, click opens a page.
 */
export default function Mosaic({ items, onOpen, onZoom }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sig = `${items.length}:${items[0]?.id}:${items[items.length - 1]?.id}`;
  const [zoom, setZoom] = useState<{ sig: string; tileW: number } | null>(null);
  const drag = useRef({ x: 0, y: 0, left: 0, top: 0, moved: false });
  const anchor = useRef<{ x: number; y: number; ratio: number } | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth - 2 * PAD, h: el.clientHeight - 2 * PAD });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = fitTiles(items.length, size.w, size.h, GAP);
  const zoomed = zoom && zoom.sig === sig ? zoom.tileW : null;
  const tileW = zoomed ?? fit.tileW;
  const width = size.w > 0 ? size.w : 1200; // jsdom/first paint have no size yet
  const cols = zoomed ? Math.min(items.length, Math.max(1, Math.floor((width + GAP) / (tileW + GAP)))) : fit.cols;

  useEffect(() => onZoom(tileW), [tileW, onZoom]);

  // Ctrl/⌘ + wheel zooms around the cursor; a native listener so preventDefault stops browser zoom
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => {
        const cur = z && z.sig === sig ? z.tileW : fit.tileW;
        const next = zoomTile(cur, e.deltaY);
        const r = el.getBoundingClientRect();
        anchor.current = { x: e.clientX - r.left, y: e.clientY - r.top, ratio: (next + GAP) / (cur + GAP) };
        return { sig, tileW: next };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [sig, fit.tileW]);

  // keep the point under the cursor in place after a zoom step
  useLayoutEffect(() => {
    const el = boxRef.current;
    const a = anchor.current;
    if (!el || !a) return;
    el.scrollLeft = (el.scrollLeft + a.x) * a.ratio - a.x;
    el.scrollTop = (el.scrollTop + a.y) * a.ratio - a.y;
    anchor.current = null;
  }, [tileW]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !boxRef.current) return;
    const el = boxRef.current;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
    const move = (ev: MouseEvent) => {
      const d = drag.current;
      const dx = ev.clientX - d.x;
      const dy = ev.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_PX) d.moved = true;
      el.scrollLeft = d.left - dx;
      el.scrollTop = d.top - dy;
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const open = (id: string) => {
    if (drag.current.moved) {
      drag.current.moved = false; // the click that ends a drag is not a click
      return;
    }
    onOpen(id);
  };

  return (
    <div ref={boxRef} className={styles.box} onMouseDown={onMouseDown}>
      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${cols}, ${tileW}px)`, gap: GAP }}>
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            className={styles.tile}
            style={{ width: tileW, animationDelay: `${Math.min(i, 40) * 12}ms` }}
            aria-label={`${it.sub} · ${it.label}`}
            title={`${it.sub} · ${it.label}`}
            onClick={() => open(it.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.thumb}
              srcSet={it.tile && `${it.tile} 160w, ${it.thumb} 480w`}
              sizes={it.tile && `${Math.round(tileW)}px`}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
