"use client";

import { useRouter } from "next/navigation";
import { categoryLabel, pageLabel, t, type UiKey, type UiLang } from "@/lib/i18n";
import { HOME, pageHref } from "@/lib/locale";
import { nextIndex } from "@/lib/showcase";
import type { PageSummary } from "@/lib/types";
import Inspector from "./Inspector";
import styles from "./PageDetail.module.css";

interface Props {
  lang: UiLang;
  category: { key: string; label: string };
  /** the category's pages, in order; prev / next step through them */
  pages: PageSummary[];
  index: number;
}

/** One dataset page at its own address: what it is, then the page and DocAI's output side by side. */
export default function PageDetail({ lang, category, pages, index }: Props) {
  const router = useRouter();
  const page = pages[index];
  const n = pages.length;
  const href = (i: number) => pageHref(lang, pages[i].id);
  const catName = categoryLabel(lang, category.key, category.label);
  // a page opens from the homepage's gallery and goes back to it
  const back = `${HOME[lang]}#dataset`;
  const facts = [
    page.lang && t(lang, `lang.${page.lang}`),
    page.format && t(lang, `format.${page.format}`),
    ...(page.has ?? []).map((h) => t(lang, `has.${h}` as UiKey)),
  ].filter(Boolean);

  return (
    <>
      <header className={styles.head}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <a href={back}>{t(lang, "pd.dataset")}</a>
          <span aria-hidden="true">/</span>
          <span>{catName}</span>
        </nav>
        <div className={styles.row}>
          <div>
            <h1 className={styles.h1}>{pageLabel(lang, page.subCategoryLabel)}</h1>
            <ul className={styles.facts}>
              {facts.map((f) => <li key={f as string}>{f}</li>)}
              <li className={styles.file} dir="ltr">{page.fileName}</li>
            </ul>
          </div>
          <div className={styles.step}>
            <a className="btn" href={href(nextIndex(index, n, -1))} aria-label={t(lang, "pd.prev")} rel="prev">
              {lang === "ar" ? "→" : "←"}
            </a>
            <span>{t(lang, "pd.of", { i: index + 1, n, category: catName })}</span>
            <a className="btn" href={href(nextIndex(index, n, 1))} aria-label={t(lang, "pd.next")} rel="next">
              {lang === "ar" ? "←" : "→"}
            </a>
          </div>
        </div>
      </header>
      {/* the page | output view keeps its left-to-right layout on the Arabic site; its panel turns right-to-left */}
      <div dir="ltr">
        <Inspector
          variant="page"
          lang={lang}
          pages={pages}
          index={index}
          onIndex={(i) => router.push(href(i))}
          onClose={() => router.push(back)}
        />
      </div>
    </>
  );
}
