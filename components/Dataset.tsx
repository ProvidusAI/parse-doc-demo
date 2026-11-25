"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CONTENT, FORMATS, LANGS, facetCounts, filterPages, filtersToQuery, parseFilters, type Filters } from "@/lib/dataset";
import { categoryLabel, pageLabel, t, type UiKey, type UiLang } from "@/lib/i18n";
import { pageHref } from "@/lib/locale";
import type { Manifest } from "@/lib/types";
import styles from "./Dataset.module.css";

/** pages per step of "Show more" */
export const BATCH = 48;

/** The dataset: filters with live counts on one side, the pages they leave on the other. Filters live in the address,
 * so a filtered view can be shared. */
export default function Dataset({ lang, manifest }: { lang: UiLang; manifest: Manifest }) {
  const router = useRouter();
  const pathname = usePathname();
  const f = parseFilters(new URLSearchParams(useSearchParams()?.toString() ?? ""));
  const [shown, setShown] = useState(BATCH);
  const pages = filterPages(manifest, f);
  const counts = facetCounts(manifest, f);
  const total = manifest.categories.reduce((a, c) => a + c.pages.length, 0);

  const set = (next: Filters) => {
    const q = filtersToQuery(next);
    setShown(BATCH);
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  const toggleHas = (h: (typeof CONTENT)[number]) =>
    set({ ...f, has: f.has?.includes(h) ? f.has.filter((x) => x !== h) : [...(f.has ?? []), h] });
  const active = !!(f.cat || f.lang || f.format || f.has?.length);

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <p className={styles.kicker}>{t(lang, "ds.kicker")}</p>
        <h1 className={styles.h1}>{t(lang, "ds.title")}</h1>
        <p className={styles.sub}>{t(lang, "ds.sub", { n: total.toLocaleString("en-US"), c: manifest.categories.length })}</p>
      </header>

      <div className={styles.body}>
        <aside className={styles.filters} aria-label={t(lang, "ds.filters")}>
          <fieldset>
            <legend className="lbl">{t(lang, "ds.category")}</legend>
            <Option label={t(lang, "ds.allCategories")} n={Object.values(counts.cat).reduce((a, b) => a + b, 0)} on={!f.cat} onClick={() => set({ ...f, cat: undefined })} />
            {manifest.categories.map((c) => (
              <Option key={c.key} label={categoryLabel(lang, c.key, c.label)} n={counts.cat[c.key]} on={f.cat === c.key} onClick={() => set({ ...f, cat: f.cat === c.key ? undefined : c.key })} />
            ))}
          </fieldset>
          <fieldset>
            <legend className="lbl">{t(lang, "ds.language")}</legend>
            {LANGS.map((l) => (
              <Option key={l} label={t(lang, `lang.${l}`)} n={counts.lang[l]} on={f.lang === l} onClick={() => set({ ...f, lang: f.lang === l ? undefined : l })} />
            ))}
          </fieldset>
          <fieldset>
            <legend className="lbl">{t(lang, "ds.source")}</legend>
            {FORMATS.map((x) => (
              <Option key={x} label={t(lang, `format.${x}`)} n={counts.format[x]} on={f.format === x} onClick={() => set({ ...f, format: f.format === x ? undefined : x })} />
            ))}
          </fieldset>
          <fieldset>
            <legend className="lbl">{t(lang, "ds.contains")}</legend>
            {CONTENT.map((h) => (
              <Option key={h} check label={t(lang, `has.${h}` as UiKey)} n={counts.has[h]} on={!!f.has?.includes(h)} onClick={() => toggleHas(h)} />
            ))}
          </fieldset>
          {active && (
            <button type="button" className={styles.clear} onClick={() => set({})}>
              {t(lang, "ds.clear")}
            </button>
          )}
        </aside>

        <section className={styles.results} aria-live="polite">
          <p className={styles.count}>{t(lang, "ds.showing", { shown: Math.min(shown, pages.length).toLocaleString("en-US"), n: pages.length.toLocaleString("en-US") })}</p>
          {pages.length === 0 ? (
            <p className={styles.none}>{t(lang, "ds.none")}</p>
          ) : (
            <ul className={styles.grid}>
              {pages.slice(0, shown).map((p) => (
                <li key={p.id}>
                  <a className={styles.card} href={pageHref(lang, p.id)}>
                    <span className={styles.mat}>
                      <img src={p.thumb} alt="" loading="lazy" />
                    </span>
                    <span className={styles.name}>{pageLabel(lang, p.subCategoryLabel)}</span>
                    <span className={styles.meta}>
                      {categoryLabel(lang, p.category, p.categoryLabel)}
                      {p.lang && <> · {t(lang, `lang.${p.lang}`)}</>}
                    </span>
                    {!!p.has?.length && (
                      <span className={styles.tags}>
                        {p.has.map((h) => <i key={h}>{t(lang, `has.${h}` as UiKey)}</i>)}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {shown < pages.length && (
            <button type="button" className={`btn ${styles.more}`} onClick={() => setShown((s) => s + BATCH)}>
              {t(lang, "ds.more")}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

function Option({ label, n, on, onClick, check }: { label: string; n: number; on: boolean; onClick(): void; check?: boolean }) {
  return (
    <button type="button" className={styles.opt} aria-pressed={on} data-check={check || undefined} disabled={!on && n === 0} onClick={onClick}>
      <span>{label}</span>
      <b>{n.toLocaleString("en-US")}</b>
    </button>
  );
}
