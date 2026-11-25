import { t, type UiLang } from "@/lib/i18n";
import { localePath } from "@/lib/locale";
import Nav from "./Nav";
import styles from "./Shell.module.css";

/** Every page: the site bar, the page, and a footer that states who built this. */
export default function Shell({ lang, children }: { lang: UiLang; children: React.ReactNode }) {
  return (
    <div className={styles.root} lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <Nav lang={lang} />
      <main className={styles.main}>{children}</main>
      <footer className={styles.foot}>
        <div className={styles.in}>
          <div className={styles.brand}>
            <img src="/brand/providus-mark.png" alt="" width={22} height={22} />
            <span dir="ltr">ProvidusBench</span>
          </div>
          <p className={styles.disclosure}>{t(lang, "foot.disclosure")}</p>
          <nav className={styles.links} aria-label="Footer">
            <a href={localePath(lang, "/leaderboard")}>{t(lang, "nav.leaderboard")}</a>
            <a href={localePath(lang, "/dataset")}>{t(lang, "nav.dataset")}</a>
            <a href={localePath(lang, "/methodology")}>{t(lang, "nav.methodology")}</a>
            <a href="https://docs.providus.ai/introduction" target="_blank" rel="noreferrer">{t(lang, "nav.docs")}</a>
            <a href="https://providus.ai/#cta-contact" target="_blank" rel="noreferrer">{t(lang, "foot.contact")}</a>
          </nav>
          <p className={styles.meta}>
            <span>© {new Date().getFullYear()} {t(lang, "foot.company")}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
