"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { THUMB_WIDTH } from "@/lib/mosaic";
import { ALL, filterPages } from "@/lib/showcase";
import type { Manifest } from "@/lib/types";
import styles from "./DatasetBrowser.module.css";
import Mosaic from "./Mosaic";

interface Props {
  manifest: Manifest;
  active: string;
  onActive(key: string): void;
  onOpen(id: string): void;
}

export default function DatasetBrowser({ manifest, active, onActive, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [fit, setFit] = useState(false); // false = Grid (mosaic), true = Fit page (captioned cards)
  const [tileW, setTileW] = useState(0);
  const [barH, setBarH] = useState(58);
  const barRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // a plain mouse wheel scrolls the tab strip sideways (touchpads already can)
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // bring the active chip fully into view (not scrollIntoView: that would scroll the page too)
  useEffect(() => {
    const el = tabsRef.current;
    const chip = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !chip || !el.clientWidth) return; // no layout (jsdom)
    if (chip.offsetLeft < el.scrollLeft) el.scrollLeft = chip.offsetLeft;
    else if (chip.offsetLeft + chip.offsetWidth > el.scrollLeft + el.clientWidth)
      el.scrollLeft = chip.offsetLeft + chip.offsetWidth - el.clientWidth;
  }, [active]);
  const onZoom = useCallback((w: number) => setTileW(w), []);

  // the mosaic fills the screen under the toolbar, whose height changes when its tabs wrap
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setBarH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (manifest.categories.length === 0) {
    return (
      <p className={styles.empty}>
        No showcase pages yet. Run <code>python -m generator.generate</code> and approve pages in{" "}
        <code>samples.json</code>.
      </p>
    );
  }

  const isAll = active === ALL;
  const cats = isAll ? manifest.categories : [manifest.categories.find((c) => c.key === active) ?? manifest.categories[0]];
  const visible = cats.map((c) => ({ ...c, matches: filterPages(c.pages, query) })).filter((c) => c.matches.length > 0);
  const total = manifest.categories.reduce((n, c) => n + c.pages.length, 0);
  const selected = isAll ? ALL : cats[0].key;
  // cap the stagger so a 400-card grid doesn't take half a minute to appear
  const delay = (i: number) => ({ animationDelay: `${Math.min(i, 12) * 70}ms` });

  const tiles = visible.flatMap((c) =>
    c.matches.map((p) => ({ id: p.id, label: c.label, sub: p.subCategoryLabel, thumb: p.thumb })),
  );

  return (
    <div style={{ "--bar-h": `${barH}px` } as React.CSSProperties}>
      <div className={styles.bar} ref={barRef}>
        <div className={styles.tabs} ref={tabsRef} role="tablist" aria-label="Categories">
          <button type="button" role="tab" aria-selected={isAll} className={styles.chip} onClick={() => onActive(ALL)}>
            All
            <em>{total}</em>
          </button>
          {manifest.categories.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={c.key === selected}
              className={styles.chip}
              onClick={() => onActive(c.key)}
            >
              {c.label}
              <em>{c.pages.length}</em>
            </button>
          ))}
        </div>
        <select
          className={styles.pick}
          aria-label="All categories"
          value={selected}
          onChange={(e) => onActive(e.target.value)}
        >
          <option value={ALL}>All ({total})</option>
          {manifest.categories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label} ({c.pages.length})
            </option>
          ))}
        </select>
        <span className={styles.sp} />
        <label className={styles.search}>
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">Search pages</span>
          <input type="search" placeholder="Search pages…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className={styles.view} role="group" aria-label="View">
          <button type="button" className={styles.chip} aria-pressed={!fit} onClick={() => setFit(false)}>
            Grid
          </button>
          <button type="button" className={styles.chip} aria-pressed={fit} onClick={() => setFit(true)}>
            Fit page
          </button>
        </div>
        {!fit && (
          <span className={styles.zoom} aria-label="Zoom">
            {tileW ? Math.round((tileW / THUMB_WIDTH) * 100) : 0}%
          </span>
        )}
      </div>

      {!fit ? (
        <div role="tabpanel" aria-label={isAll ? "All" : cats[0].label}>
          {tiles.length === 0 ? (
            <p className={`${styles.none} ${styles.noneGrid}`}>{t("en", "noMatch")}</p>
          ) : (
            <Mosaic items={tiles} onOpen={onOpen} onZoom={onZoom} />
          )}
        </div>
      ) : (
      <div className={styles.section} role="tabpanel" aria-label={isAll ? "All" : cats[0].label}>
        {visible.length === 0 ? (
          <>
            {!isAll && <SectionHead label={cats[0].label} count={cats[0].pages.length} />}
            <p className={styles.none}>{t("en", "noMatch")}</p>
          </>
        ) : (
          visible.map((c) => (
            <section key={c.key} className={styles.group}>
              <SectionHead label={c.label} count={c.pages.length} />
              <div className={styles.grid} key={`${c.key}-${active}`}>
                {c.matches.map((p, i) => (
                  <button key={p.id} type="button" className={styles.card} style={delay(i)} onClick={() => onOpen(p.id)}>
                    <span className={styles.th}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.thumb} alt="" loading="lazy" decoding="async" />
                    </span>
                    <span className={styles.cap}>
                      {p.subCategoryLabel}
                      <span>1 page</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
      )}
      <div className={`${styles.hint} ${fit ? "" : styles.hintGrid}`}>
        {!fit && <span className={styles.hintIcon} aria-hidden="true">⛶</span>}
        {t("en", fit ? "hint" : "hintGrid")}
      </div>
    </div>
  );
}

function SectionHead({ label, count }: { label: string; count: number }) {
  return (
    <div className={styles.head}>
      <h2>{label}</h2>
      <span>{t("en", "docTypes", { n: count })}</span>
    </div>
  );
}
