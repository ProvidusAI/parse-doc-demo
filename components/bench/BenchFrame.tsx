import type { UiLang } from "@/lib/i18n";
import { HOME } from "@/lib/locale";
import { BenchFooter, BenchNav, geist, geistMono } from "./BenchChrome";
import { COPY } from "./copy";
import styles from "./BenchFrame.module.css";

/** A page other than the homepage, in the homepage's look: its nav and footer around the page, and the site's colour
 * and font names pointed at the homepage's, so existing components restyle without changes. `other` is this page in
 * the other language. */
export default function BenchFrame({ lang, cats, other, children }: { lang: UiLang; cats: number; other: string; children: React.ReactNode }) {
  const c = COPY[lang];
  return (
    <div className={`bench ${styles.tokens} ${styles.frame} ${geist.variable} ${geistMono.variable}`} lang={lang} dir={c.dir}>
      <div className="pb" dir={c.dir}>
        <a className="skip-link" href="#main">{c.nav.skip}</a>
        <BenchNav c={c} at={HOME[lang]} cats={cats} other={other} />
      </div>
      <main id="main" className={styles.main}>{children}</main>
      <div className="pb" dir={c.dir}>
        <BenchFooter c={c} at={HOME[lang]} />
      </div>
    </div>
  );
}
