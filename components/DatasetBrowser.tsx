"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { ALL, filterPages } from "@/lib/showcase";
import type { Manifest } from "@/lib/types";
import styles from "./DatasetBrowser.module.css";

interface Props {
  manifest: Manifest;
  active: string;
  onActive(key: string): void;
  onOpen(id: string): void;
}

export default function DatasetBrowser({ manifest, active, onActive, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [fit, setFit] = useState(false);
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

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.tabs} role="tablist" aria-label="Categories">
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
      </div>

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
              <div className={`${styles.grid} ${fit ? styles.fit : ""}`} key={`${c.key}-${active}`}>
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
      <div className={styles.hint}>{t("en", "hint")}</div>
    </>
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
