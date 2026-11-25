"use client";

import { useState } from "react";
import type { UiLang } from "@/lib/i18n";
import { best, METRICS, PAGES_PER_LANG, ranked, SYSTEMS, type DocLang, type Kind, type SortKey } from "@/lib/leaderboard";
import { localePath } from "@/lib/locale";
import styles from "./Leaderboard.module.css";

const COPY = {
  en: {
    kicker: "Leaderboard",
    title: "Which systems read Arabic documents best",
    sub: "Systems scored on the same Arabic and English pages, task by task. Select a column to sort.",
    disclosure: "DocAI is built by Providus AI, which runs ProvidusBench, so its row is marked as ours.",
    docLang: "Document language",
    langs: { ar: "Arabic pages", en: "English pages" },
    rank: "#",
    system: "System",
    cols: { overall: "Overall", text: "Text", tables: "Tables", order: "Reading order", grounding: "Grounding" },
    kinds: { ours: "Ours", api: "API model", open: "Open weights", parser: "Document parser", classic: "Classic OCR" } as Record<Kind, string>,
    meta: `${PAGES_PER_LANG} pages per language · scores from 0 to 100, higher is better · ± is the margin of error`,
    tiedNote: "= shared rank: the margins overlap",
    defs: [
      ["Text", "how close the extracted text is to the checked text: 100 × (1 − normalised edit distance)."],
      ["Tables", "how closely each table's structure and cell text match the checked table: TEDS × 100."],
      ["Reading order", "whether text blocks come out in the order a person reads them: 100 × (1 − edit distance of the order)."],
      ["Grounding", "whether each piece of text is boxed in the right place on the page."],
      ["Overall", "the plain mean of the four task scores. Systems whose margins overlap share a rank."],
    ],
    best: "best in column",
    more: "See the full leaderboard",
  },
  ar: {
    kicker: "لوحة الصدارة",
    title: "أي الأنظمة يقرأ المستندات العربية بأعلى دقة",
    sub: "أنظمة قيست على الصفحات العربية والإنجليزية نفسها، مهمة تلو الأخرى. اختر عموداً للترتيب.",
    disclosure: "طوّرت Providus AI نظام DocAI وهي من تدير ProvidusBench، لذا وُسم صفّه بأنه نظامنا.",
    docLang: "لغة المستندات",
    langs: { ar: "الصفحات العربية", en: "الصفحات الإنجليزية" },
    rank: "#",
    system: "النظام",
    cols: { overall: "الإجمالي", text: "النص", tables: "الجداول", order: "ترتيب القراءة", grounding: "الربط بالموضع" },
    kinds: { ours: "نظامنا", api: "نموذج عبر واجهة برمجية", open: "أوزان مفتوحة", parser: "محلّل مستندات", classic: "تعرّف ضوئي تقليدي" } as Record<Kind, string>,
    meta: `${PAGES_PER_LANG} صفحة لكل لغة · الدرجات من 0 إلى 100، والأعلى أفضل · ± هامش الخطأ`,
    tiedNote: "= مرتبة مشتركة: تتداخل هوامش الخطأ",
    defs: [
      ["النص", "مدى قرب النص المستخرج من النص المدقق: 100 × (1 − مسافة التحرير المعيارية)."],
      ["الجداول", "مدى تطابق بنية كل جدول ونص خلاياه مع الجدول المدقق: TEDS × 100."],
      ["ترتيب القراءة", "هل تخرج كتل النص بالترتيب الذي يقرؤها به الإنسان: 100 × (1 − مسافة التحرير للترتيب)."],
      ["الربط بالموضع", "هل حُدّد موضع كل نص في مكانه الصحيح في الصفحة."],
      ["الإجمالي", "المتوسط البسيط لدرجات المهام الأربع. تتشارك الأنظمة التي تتداخل هوامشها المرتبة نفسها."],
    ],
    best: "الأفضل في العمود",
    more: "عرض لوحة الصدارة كاملة",
  },
};

const fmt = (v: number) => v.toFixed(1);

/** The leaderboard table. `preview` (on the overview): the top rows on Arabic pages, no controls, a link to the page. */
export default function Leaderboard({ lang, preview = false }: { lang: UiLang; preview?: boolean }) {
  const c = COPY[lang];
  const [doc, setDoc] = useState<DocLang>("ar");
  const [by, setBy] = useState<SortKey>("overall");
  const rows = ranked(SYSTEMS, doc, preview ? "overall" : by);
  const shown = preview ? rows.slice(0, 5) : rows;
  const cols: SortKey[] = ["overall", ...METRICS];
  const top = Object.fromEntries(cols.map((k) => [k, best(rows, doc, k)]));

  return (
    <div className={preview ? styles.preview : styles.wrap}>
      <header className={styles.head}>
        <p className={styles.kicker}>{c.kicker}</p>
        {preview ? <h2 className={styles.h2}>{c.title}</h2> : <h1 className={styles.h1}>{c.title}</h1>}
        <p className={styles.sub}>{c.sub}</p>
      </header>

      {!preview && (
        <div className={styles.controls}>
          <div className={styles.seg} role="group" aria-label={c.docLang}>
            {(["ar", "en"] as DocLang[]).map((l) => (
              <button key={l} type="button" aria-pressed={doc === l} onClick={() => setDoc(l)}>
                {c.langs[l]}
              </button>
            ))}
          </div>
          <p className={styles.meta}>{c.meta}</p>
        </div>
      )}

      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className="sr-only">{`${c.title} · ${c.langs[doc]}`}</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.rank}>{c.rank}</th>
              <th scope="col" className={styles.sys}>{c.system}</th>
              {cols.map((k) => (
                <th key={k} scope="col" className={k === "overall" ? styles.overallHead : styles.num} aria-sort={!preview && by === k ? "descending" : undefined}>
                  {preview ? (
                    <span>{c.cols[k]} ↑</span>
                  ) : (
                    <button type="button" onClick={() => setBy(k)}>
                      {c.cols[k]} <span aria-hidden="true">↑</span>
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.system.id} className={r.system.kind === "ours" ? styles.ours : undefined}>
                <td className={styles.rank}>{r.tied ? `=${r.rank}` : r.rank}</td>
                <th scope="row" className={styles.sys}>
                  <span className={styles.name}>{lang === "ar" ? r.system.nameAr : r.system.name}</span>
                  <span className={styles.kind}>{c.kinds[r.system.kind]}</span>
                </th>
                <td className={styles.overall}>
                  <span className={styles.ov} data-best={r.overall === top.overall || undefined}>{fmt(r.overall)}</span>
                  <span className={styles.ci}>±{fmt(r.ci)}</span>
                  <span className={styles.track} aria-hidden="true"><i style={{ width: `${r.overall}%` }} /></span>
                </td>
                {METRICS.map((m) => {
                  const v = r.system.scores[doc][m];
                  return (
                    <td key={m} className={styles.num} data-best={v === top[m] || undefined}>
                      {fmt(v)}
                      {v === top[m] && <span className="sr-only"> ({c.best})</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {preview ? (
        <a className={styles.more} href={localePath(lang, "/leaderboard")}>
          {c.more} <span aria-hidden="true">{lang === "ar" ? "←" : "→"}</span>
        </a>
      ) : (
        <>
          <p className={styles.tied}>{c.tiedNote}</p>
          <dl className={styles.defs}>
            {c.defs.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <p className={styles.disclosure}>{c.disclosure}</p>
        </>
      )}
    </div>
  );
}
