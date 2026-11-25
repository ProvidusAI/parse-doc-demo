import { categoryLabel, type UiLang } from "@/lib/i18n";
import { datasetStats } from "@/lib/dataset";
import { localePath, pageHref } from "@/lib/locale";
import type { Manifest, ShowcaseResult } from "@/lib/types";
import HeroSpecimen from "./HeroSpecimen";
import styles from "./Overview.module.css";

/** The page the hero shows: a Saudi tender annex (TAQEEM) where DocAI's boxes and text are both right, cell for cell. */
export const HERO_PAGE = "e4c/223_tender_documents_bid_attachment_p9";

/** Western digits on both sites, grouped: 1,001 */
const n = (v: number) => v.toLocaleString("en-US");

const COPY = {
  en: {
    kicker: "Open evaluation · Arabic & English",
    h1: "How well does AI read Arabic documents?",
    lede: "ProvidusBench collects real government, financial and commercial pages and publishes exactly what document AI makes of them. Every page and every output is open, our own system's included.",
    browse: "Browse {n} pages",
    how: "How we evaluate",
    what: "What",
    whatA: "Text, layout, tables and grounding on real Arabic and English pages.",
    howQ: "How",
    howA: "Public benchmarks scored with their own code, and our own Arabic set with human-checked answers.",
    trust: "Trust",
    trustA: "Every output is public, and every score states how it was measured.",
    pages: "pages",
    categories: "categories",
    types: "page types",
    arabic: "Arabic or bilingual",
    dsKicker: "The dataset",
    dsTitle: "{n} pages, one from each source document",
    dsSub: "Public documents from governments, companies and international bodies, in Arabic, English or both.",
    byCat: "By category",
    language: "Language",
    langAr: "Arabic or bilingual",
    langEn: "English",
    source: "Source",
    pdf: "PDF",
    image: "Photo or scan",
    contains: "Contains",
    has: { table: "Tables", figure: "Figures", chart: "Charts", formula: "Formulas", stamp: "Stamps" },
    langNote: "Arabic-only and bilingual pages share one tag for now.",
    pagesOf: "{n} pages · {p}%",
    bandKicker: "For teams with Arabic documents",
    bandTitle: "See it on your own documents",
    bandText: "DocAI runs on-premise, in your VPC or in the cloud. We can run it on a sample of your documents, privately, and show you every output the way this site does.",
    facts: ["On-premise, VPC or cloud", "Arabic and English", "Every value linked to its place on the page"],
    talk: "Talk to us",
    try: "Try DocAI",
  },
  ar: {
    kicker: "تقييم مفتوح · العربية والإنجليزية",
    h1: "ما مدى دقة الذكاء الاصطناعي في قراءة المستندات العربية؟",
    lede: "تجمع ProvidusBench صفحات حقيقية من مستندات حكومية ومالية وتجارية، وتنشر ما يستخرجه منها الذكاء الاصطناعي كما هو. كل صفحة وكل مخرج متاح للجميع، بما في ذلك مخرجات نظامنا.",
    browse: "تصفّح {n} صفحة",
    how: "كيف نقيّم",
    what: "ماذا",
    whatA: "النص والتخطيط والجداول وربطها بموضعها في صفحات عربية وإنجليزية حقيقية.",
    howQ: "كيف",
    howA: "معايير عامة تُحتسب نتائجها بشيفرة أصحابها، ومجموعتنا العربية بإجابات راجعها بشر.",
    trust: "الثقة",
    trustA: "كل المخرجات منشورة، وكل نتيجة توضّح طريقة قياسها.",
    pages: "صفحة",
    categories: "فئة",
    types: "نوع صفحة",
    arabic: "عربية أو ثنائية اللغة",
    dsKicker: "مجموعة البيانات",
    dsTitle: "{n} صفحة، واحدة من كل مستند مصدر",
    dsSub: "مستندات عامة صادرة عن حكومات وشركات وهيئات دولية، بالعربية أو الإنجليزية أو كلتيهما.",
    byCat: "حسب الفئة",
    language: "اللغة",
    langAr: "عربية أو ثنائية اللغة",
    langEn: "إنجليزية",
    source: "المصدر",
    pdf: "PDF",
    image: "صورة أو مسح ضوئي",
    contains: "تحتوي على",
    has: { table: "جداول", figure: "أشكال", chart: "مخططات", formula: "معادلات", stamp: "أختام" },
    langNote: "تشترك الصفحات العربية فقط والثنائية اللغة في وسم واحد حالياً.",
    pagesOf: "{n} صفحة · {p}٪",
    bandKicker: "للفرق التي تعمل على مستندات عربية",
    bandTitle: "شاهد النتائج على مستنداتك",
    bandText: "يعمل DocAI داخل مقرّك أو في سحابتك الخاصة أو على السحابة العامة. يمكننا تشغيله على عيّنة من مستنداتك بسرية تامة، وعرض كل مخرجاته كما يعرضها هذا الموقع.",
    facts: ["داخل المقر أو سحابة خاصة أو عامة", "العربية والإنجليزية", "كل قيمة مرتبطة بموضعها في الصفحة"],
    talk: "تواصل معنا",
    try: "جرّب DocAI",
  },
};

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));

function Split({ title, items }: { title: string; items: { label: string; n: number }[] }) {
  const total = items.reduce((a, b) => a + b.n, 0) || 1;
  return (
    <div className={styles.split}>
      <h3 className="lbl">{title}</h3>
      <ul>
        {items.map((it) => (
          <li key={it.label}>
            <span>{it.label}</span>
            <b>{n(it.n)}</b>
            <i style={{ "--w": `${(it.n / total) * 100}%` } as React.CSSProperties} aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Overview({ lang, manifest, hero }: { lang: UiLang; manifest: Manifest; hero: ShowcaseResult | null }) {
  const c = COPY[lang];
  const s = datasetStats(manifest);
  const max = Math.max(...s.byCategory.map((x) => x.n));
  const cats = [...s.byCategory].sort((a, b) => b.n - a.n);
  const datasetHref = localePath(lang, "/dataset");

  return (
    <>
      <div className={styles.heroBand}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.kicker}>{c.kicker}</p>
          <h1 className={styles.h1}>{c.h1}</h1>
          <p className={styles.lede}>{c.lede}</p>
          <div className={styles.ctas}>
            <a className="btn btn-dark" href={datasetHref}>{fill(c.browse, { n: n(s.pages) })}</a>
            <a className="btn" href={localePath(lang, "/methodology")}>{c.how}</a>
          </div>
          <dl className={styles.qa}>
            <div><dt>{c.what}</dt><dd>{c.whatA}</dd></div>
            <div><dt>{c.howQ}</dt><dd>{c.howA}</dd></div>
            <div><dt>{c.trust}</dt><dd>{c.trustA}</dd></div>
          </dl>
          <dl className={styles.stats}>
            <div><dd>{n(s.pages)}</dd><dt>{c.pages}</dt></div>
            <div><dd>{s.categories}</dd><dt>{c.categories}</dt></div>
            <div><dd>{s.types}</dd><dt>{c.types}</dt></div>
            <div><dd>{n(s.lang["ar-en"])}</dd><dt>{c.arabic}</dt></div>
          </dl>
        </div>
        {hero && <HeroSpecimen lang={lang} result={hero} href={pageHref(lang, HERO_PAGE)} />}
      </section>
      </div>

      <section className={styles.section} aria-labelledby="ds-title">
        <div className={styles.head}>
          <p className={styles.kicker}>{c.dsKicker}</p>
          <h2 id="ds-title" className={styles.h2}>{fill(c.dsTitle, { n: n(s.pages) })}</h2>
          <p className={styles.sub}>{c.dsSub}</p>
        </div>
        <div className={styles.composition}>
          <div className={styles.cats}>
            <h3 className="lbl">{c.byCat}</h3>
            <ul>
              {cats.map((x) => (
                <li key={x.key}>
                  <a href={`${datasetHref}?cat=${x.key}`} title={fill(c.pagesOf, { n: x.n, p: Math.round((x.n / s.pages) * 100) })}>
                    <span className={styles.catName}>{categoryLabel(lang, x.key, x.label)}</span>
                    <span className={styles.track}><i style={{ "--w": `${(x.n / max) * 100}%` } as React.CSSProperties} /></span>
                    <b>{x.n}</b>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.splits}>
            <Split title={c.language} items={[{ label: c.langAr, n: s.lang["ar-en"] }, { label: c.langEn, n: s.lang.en }]} />
            <Split title={c.source} items={[{ label: c.pdf, n: s.format.pdf }, { label: c.image, n: s.format.image }]} />
            <div className={styles.split}>
              <h3 className="lbl">{c.contains}</h3>
              <ul className={styles.contains}>
                {(["table", "figure", "chart", "formula", "stamp"] as const).map((h) => (
                  <li key={h}>
                    <a href={`${datasetHref}?has=${h}`}><span>{c.has[h]}</span><b>{s.has[h]}</b></a>
                  </li>
                ))}
              </ul>
            </div>
            <p className={styles.langNote}>{c.langNote}</p>
          </div>
        </div>
      </section>

      <section className={styles.band}>
        <div className={styles.bandIn}>
          <div>
            <p className={styles.bandKicker}>{c.bandKicker}</p>
            <h2 className={styles.h2}>{c.bandTitle}</h2>
            <p className={styles.bandText}>{c.bandText}</p>
            <div className={styles.ctas}>
              <a className={`btn ${styles.signal}`} href="https://providus.ai/#cta-contact" target="_blank" rel="noreferrer">{c.talk}</a>
              <a className={`btn ${styles.ghost}`} href="https://platform.providus.ai/" target="_blank" rel="noreferrer">{c.try}</a>
            </div>
          </div>
          <ul className={styles.facts}>
            {c.facts.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      </section>
    </>
  );
}
