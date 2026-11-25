"use client";

import { usePathname } from "next/navigation";
import { t, type UiLang } from "@/lib/i18n";
import { LANG_COOKIE, localePath, splitLang } from "@/lib/locale";
import styles from "./Nav.module.css";

const remember = (lang: UiLang) => () => {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
};

const LINKS = [
  ["/", "nav.overview"],
  ["/leaderboard", "nav.leaderboard"],
  ["/dataset", "nav.dataset"],
  ["/methodology", "nav.methodology"],
] as const;

/** The site bar: the same on every page. The language switch keeps you on the page you are reading. */
export default function Nav({ lang }: { lang: UiLang }) {
  const { path } = splitLang(usePathname() ?? "/");
  const current = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

  return (
    <header className={styles.bar}>
      <nav className={styles.in} aria-label="Main">
        <a className={styles.mark} href={localePath(lang, "/")} aria-label={t(lang, "nav.home")}>
          <img src="/brand/providus-mark.png" alt="" width={26} height={26} />
          <span dir="ltr">ProvidusBench</span>
        </a>
        <div className={styles.links}>
          {LINKS.map(([href, key]) => (
            <a key={href} href={localePath(lang, href)} aria-current={current(href) ? "page" : undefined}>
              {t(lang, key)}
            </a>
          ))}
          <a href="https://docs.providus.ai/introduction" target="_blank" rel="noreferrer">
            {t(lang, "nav.docs")} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className={styles.end}>
          <div className={styles.lang} role="group" aria-label={t(lang, "nav.lang")}>
            <a href={localePath("en", path)} lang="en" aria-current={lang === "en" ? "true" : undefined} onClick={remember("en")}>
              EN
            </a>
            <a href={localePath("ar", path)} lang="ar" aria-current={lang === "ar" ? "true" : undefined} onClick={remember("ar")}>
              العربية
            </a>
          </div>
          <a className={`btn btn-dark ${styles.try}`} href="https://platform.providus.ai/" target="_blank" rel="noreferrer">
            {t(lang, "nav.try")}
          </a>
        </div>
      </nav>
    </header>
  );
}
