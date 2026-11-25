import { datasetStats } from "@/lib/dataset";
import { categoryLabel, type UiLang } from "@/lib/i18n";
import { localePath } from "@/lib/locale";
import type { Manifest } from "@/lib/types";
import styles from "./Methodology.module.css";

const n = (v: number) => v.toLocaleString("en-US");

type Copy = ReturnType<typeof en>;

function en(s: ReturnType<typeof datasetStats>) {
  return {
    kicker: "Methodology",
    title: "How ProvidusBench is built, and how it scores systems",
    lede: "This page states what the dataset contains, what each page shows, how scores are produced and what the limits are.",
    toc: "On this page",
    sections: {
      purpose: "Purpose",
      dataset: "The dataset",
      output: "What each page shows",
      scoring: "How systems are scored",
      rules: "Rules we hold ourselves to",
      limits: "Limitations",
    },
    purpose: [
      "ProvidusBench measures how well document AI reads real Arabic and English pages: the text, the layout, tables and where each value sits on the page.",
      "It is built by Providus AI, which also builds DocAI, one of the systems it covers. That is a conflict of interest, so the benchmark is designed to be checked: every page and every output is public, and every score states how it was produced.",
    ],
    datasetIntro: `${n(s.pages)} pages in ${s.categories} categories and ${s.types} page types. Each page comes from a different source document: public documents from governments, companies and international bodies.`,
    table: { what: "What", count: "Pages", cat: "Category" },
    rows: [
      ["Arabic or bilingual", s.lang["ar-en"]],
      ["English", s.lang.en],
      ["From a PDF", s.format.pdf],
      ["From a photo or scan", s.format.image],
      ["Contain a table", s.has.table],
      ["Contain a figure", s.has.figure],
      ["Contain a chart", s.has.chart],
      ["Contain a formula", s.has.formula],
      ["Contain a stamp", s.has.stamp],
    ] as [string, number][],
    catsNote: "Categories are uneven: Financial and Government are larger because they come from an earlier collection.",
    output: [
      "Every page shows the output of DocAI, Providus's document parser, exactly as it came back. Nothing is corrected by hand.",
      "For every page: the elements DocAI found (titles, text, tables, figures, headers and others), each with its box on the page, and the text it read. For most tables: every cell with its own box.",
      "For 21 pages: the later steps as well, splitting a file into documents and extracting structured fields.",
      "This output is not ground truth. Where DocAI misread a word, the mistake is shown as is.",
    ],
    scoringIntro: "Systems are scored in two ways.",
    steps: [
      ["Public benchmarks", "Systems are run on established benchmarks, KITAB-Bench and OmniDocBench, and scored with each benchmark's own, unmodified code. Results are reported per task, with the subset and number of items."],
      ["Our own pages", "A stratified set of our pages gets human-checked answers. Every system, ours included, is then scored on the same pages with the same open metrics."],
    ],
    metricsTitle: "Metrics",
    metric: { name: "Metric", measures: "Measures", better: "Better" },
    metrics: [
      ["Normalised edit distance", "How far the extracted text is from the reference, 0 to 1", "Lower"],
      ["Reading-order edit distance", "How far the order of text blocks is from the reference", "Lower"],
      ["TEDS", "How closely a table's structure and cell text match the reference, 0 to 1", "Higher"],
      ["CER", "Character error rate for OCR text", "Lower"],
      ["chrF", "Character n-gram match, robust to Arabic word forms", "Higher"],
    ],
    rules: [
      "Every score names its benchmark, subset, number of items, scoring code and version, and the date it was run.",
      "Our own system is labelled as ours, and results where it does worse are shown alongside results where it does better.",
      "There is no single overall score unless its formula is published next to it.",
      "Where a score has a margin of error, it is shown, and systems within it share a rank.",
      "A missing value is shown as missing, with the reason, never filled in.",
    ],
    limits: [
      "Arabic-only and bilingual pages share one language tag.",
      "\"From a PDF\" is not the same as born-digital: some PDFs are scans.",
      "Parse times were measured on our own hardware and are not comparable between systems, so they are not used for ranking.",
    ],
    browse: "Browse the dataset",
  };
}

function ar(s: ReturnType<typeof datasetStats>): Copy {
  return {
    kicker: "المنهجية",
    title: "كيف بُنيت ProvidusBench، وكيف تقيس أداء الأنظمة",
    lede: "توضّح هذه الصفحة محتوى مجموعة البيانات، وما تعرضه كل صفحة، وكيف تُحتسب النتائج، وما حدود العمل.",
    toc: "في هذه الصفحة",
    sections: {
      purpose: "الهدف",
      dataset: "مجموعة البيانات",
      output: "ما تعرضه كل صفحة",
      scoring: "كيف تُقاس الأنظمة",
      rules: "القواعد التي نلتزم بها",
      limits: "حدود العمل",
    },
    purpose: [
      "تقيس ProvidusBench مدى دقة أنظمة الذكاء الاصطناعي للمستندات في قراءة صفحات عربية وإنجليزية حقيقية: النص والتخطيط والجداول وموضع كل قيمة في الصفحة.",
      "طوّرتها Providus AI، وهي أيضاً مطوّرة DocAI، أحد الأنظمة التي يغطيها المعيار. وهذا تعارض في المصالح، لذا صُمّم المعيار ليكون قابلاً للتحقق: كل صفحة وكل مخرج منشور، وكل نتيجة توضّح طريقة احتسابها.",
    ],
    datasetIntro: `${n(s.pages)} صفحة في ${s.categories} فئة و${s.types} نوع صفحة. كل صفحة من مستند مصدر مختلف: مستندات عامة صادرة عن حكومات وشركات وهيئات دولية.`,
    table: { what: "البند", count: "الصفحات", cat: "الفئة" },
    rows: [
      ["عربية أو ثنائية اللغة", s.lang["ar-en"]],
      ["إنجليزية", s.lang.en],
      ["من ملف PDF", s.format.pdf],
      ["من صورة أو مسح ضوئي", s.format.image],
      ["تحتوي على جدول", s.has.table],
      ["تحتوي على شكل", s.has.figure],
      ["تحتوي على مخطط", s.has.chart],
      ["تحتوي على معادلة", s.has.formula],
      ["تحتوي على ختم", s.has.stamp],
    ],
    catsNote: "الفئات غير متساوية: فئتا المالية والحكومة أكبر لأنهما من مجموعة جُمعت سابقاً.",
    output: [
      "تعرض كل صفحة مخرجات DocAI، محلّل المستندات من Providus، كما وردت تماماً دون أي تصحيح يدوي.",
      "لكل صفحة: العناصر التي وجدها DocAI (العناوين والنصوص والجداول والأشكال والترويسات وغيرها) مع موضع كل منها في الصفحة، والنص الذي قرأه. ولمعظم الجداول: كل خلية بموضعها.",
      "لـ 21 صفحة: الخطوات اللاحقة أيضاً، أي تقسيم الملف إلى مستندات واستخراج حقول منظّمة.",
      "هذه المخرجات ليست إجابات مرجعية. وحيث أخطأ DocAI في قراءة كلمة، يظهر الخطأ كما هو.",
    ],
    scoringIntro: "تُقاس الأنظمة بطريقتين.",
    steps: [
      ["معايير عامة", "تُشغَّل الأنظمة على معايير معروفة، هي KITAB-Bench وOmniDocBench، وتُحتسب النتائج بشيفرة كل معيار دون تعديل. وتُعرض النتائج لكل مهمة مع المجموعة الجزئية وعدد العناصر."],
      ["صفحاتنا", "تحصل مجموعة مختارة من صفحاتنا على إجابات راجعها بشر، ثم تُقاس كل الأنظمة، ومنها نظامنا، على الصفحات نفسها بالمقاييس المفتوحة نفسها."],
    ],
    metricsTitle: "المقاييس",
    metric: { name: "المقياس", measures: "ما يقيسه", better: "الأفضل" },
    metrics: [
      ["مسافة التحرير المعيارية", "مدى ابتعاد النص المستخرج عن النص المرجعي، من 0 إلى 1", "الأقل"],
      ["مسافة التحرير لترتيب القراءة", "مدى ابتعاد ترتيب كتل النص عن الترتيب المرجعي", "الأقل"],
      ["TEDS", "مدى تطابق بنية الجدول ونص خلاياه مع المرجع، من 0 إلى 1", "الأعلى"],
      ["CER", "نسبة الخطأ في الحروف لنص التعرّف الضوئي", "الأقل"],
      ["chrF", "تطابق سلاسل الحروف، ويناسب تصريفات الكلمات العربية", "الأعلى"],
    ],
    rules: [
      "تذكر كل نتيجة المعيار والمجموعة الجزئية وعدد العناصر وشيفرة القياس وإصدارها وتاريخ التشغيل.",
      "يُوسَم نظامنا بأنه نظامنا، وتُعرض النتائج التي يتأخر فيها إلى جانب تلك التي يتقدّم فيها.",
      "لا توجد نتيجة إجمالية واحدة ما لم تُنشر معادلتها بجانبها.",
      "حيث يكون للنتيجة هامش خطأ، يُعرض، وتتشارك الأنظمة الواقعة ضمنه المرتبة نفسها.",
      "تُعرض القيمة الناقصة على أنها ناقصة مع ذكر السبب، ولا تُملأ أبداً.",
    ],
    limits: [
      "تشترك الصفحات العربية فقط والثنائية اللغة في وسم لغة واحد.",
      "«من ملف PDF» لا يعني أنه رقمي الأصل، فبعض ملفات PDF صور ممسوحة.",
      "قيست مدد التحليل على أجهزتنا ولا تصلح للمقارنة بين الأنظمة، لذا لا تُستخدم في الترتيب.",
    ],
    browse: "تصفّح مجموعة البيانات",
  };
}

export default function Methodology({ lang, manifest }: { lang: UiLang; manifest: Manifest }) {
  const s = datasetStats(manifest);
  const c = (lang === "ar" ? ar : en)(s);
  const ids = Object.keys(c.sections) as (keyof Copy["sections"])[];

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <p className={styles.kicker}>{c.kicker}</p>
        <h1 className={styles.h1}>{c.title}</h1>
        <p className={styles.lede}>{c.lede}</p>
      </header>
      <div className={styles.body}>
        <nav className={styles.toc} aria-label={c.toc}>
          <p className="lbl">{c.toc}</p>
          <ol>
            {ids.map((id) => (
              <li key={id}><a href={`#${id}`}>{c.sections[id]}</a></li>
            ))}
          </ol>
        </nav>
        <article className={styles.article}>
          <section id="purpose">
            <h2>{c.sections.purpose}</h2>
            {c.purpose.map((p) => <p key={p}>{p}</p>)}
          </section>

          <section id="dataset">
            <h2>{c.sections.dataset}</h2>
            <p>{c.datasetIntro}</p>
            <div className={styles.tables}>
              <table>
                <thead><tr><th>{c.table.what}</th><th className={styles.num}>{c.table.count}</th></tr></thead>
                <tbody>
                  {c.rows.map(([k, v]) => <tr key={k}><td>{k}</td><td className={styles.num}>{n(v)}</td></tr>)}
                </tbody>
              </table>
              <table>
                <thead><tr><th>{c.table.cat}</th><th className={styles.num}>{c.table.count}</th></tr></thead>
                <tbody>
                  {s.byCategory.map((x) => (
                    <tr key={x.key}><td>{categoryLabel(lang, x.key, x.label)}</td><td className={styles.num}>{x.n}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.small}>{c.catsNote}</p>
          </section>

          <section id="output">
            <h2>{c.sections.output}</h2>
            {c.output.map((p) => <p key={p}>{p}</p>)}
          </section>

          <section id="scoring">
            <h2>{c.sections.scoring}</h2>
            <p>{c.scoringIntro}</p>
            <ol className={styles.steps}>
              {c.steps.map(([k, v]) => <li key={k}><strong>{k}</strong><p>{v}</p></li>)}
            </ol>
            <h3>{c.metricsTitle}</h3>
            <div className={styles.scroll}>
              <table>
                <thead><tr><th>{c.metric.name}</th><th>{c.metric.measures}</th><th>{c.metric.better}</th></tr></thead>
                <tbody>
                  {c.metrics.map(([a, b, d]) => (
                    <tr key={a}><td className={styles.metric}>{a}</td><td>{b}</td><td>{d === "Lower" || d === "الأقل" ? "↓ " : "↑ "}{d}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="rules">
            <h2>{c.sections.rules}</h2>
            <ul>{c.rules.map((r) => <li key={r}>{r}</li>)}</ul>
          </section>

          <section id="limits">
            <h2>{c.sections.limits}</h2>
            <ul>{c.limits.map((r) => <li key={r}>{r}</li>)}</ul>
          </section>

          <a className="btn btn-dark" href={localePath(lang, "/dataset")}>{c.browse}</a>
        </article>
      </div>
    </div>
  );
}
