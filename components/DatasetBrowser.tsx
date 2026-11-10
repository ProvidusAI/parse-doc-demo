"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { filterPages } from "@/lib/showcase";
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
  const cat = manifest.categories.find((c) => c.key === active) ?? manifest.categories[0];

  if (!cat) {
    return (
      <p className={styles.empty}>
        No showcase pages yet. Run <code>python -m generator.generate</code> and approve pages in{" "}
        <code>samples.json</code>.
      </p>
    );
  }

  const pages = filterPages(cat.pages, query);

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.tabs} role="tablist" aria-label="Categories">
          {manifest.categories.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={c.key === cat.key}
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

      <div className={styles.section} role="tabpanel" aria-label={cat.label}>
        <div className={styles.head}>
          <h2>{cat.label}</h2>
          <span>{t("en", "docTypes", { n: cat.pages.length })}</span>
        </div>
        {pages.length === 0 ? (
          <p className={styles.none}>{t("en", "noMatch")}</p>
        ) : (
          <div className={`${styles.grid} ${fit ? styles.fit : ""}`} key={cat.key}>
            {pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={styles.card}
                style={{ animationDelay: `${i * 70}ms` }}
                onClick={() => onOpen(p.id)}
              >
                <span className={styles.th}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb} alt="" loading="lazy" />
                </span>
                <span className={styles.cap}>
                  {p.subCategoryLabel}
                  <span>1 page</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={styles.hint}>{t("en", "hint")}</div>
    </>
  );
}
