import type { UiLang } from "./i18n";

/** Cookie the nav's language switch sets, so a choice outlasts the country guess. */
export const LANG_COOKIE = "lang";

/** Gulf Cooperation Council: Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman. */
const GCC = new Set(["SA", "AE", "QA", "KW", "BH", "OM"]);

/** Which site a visitor to `/` should see: their saved choice, else Arabic for the GCC, else English. */
export function landingLang(country: string | null | undefined, saved: string | undefined): UiLang {
  if (saved === "en" || saved === "ar") return saved;
  return country && GCC.has(country.toUpperCase()) ? "ar" : "en";
}

/** Home page of each language. */
export const HOME: Record<UiLang, string> = { en: "/", ar: "/ar" };

/** The same site page in `lang`: "/dataset" is "/ar/dataset" in Arabic. */
export function localePath(lang: UiLang, path: string): string {
  if (lang === "en") return path;
  return path === "/" ? HOME.ar : `${HOME.ar}${path}`;
}

/** An address split into its language and the site page it shows. */
export function splitLang(pathname: string): { lang: UiLang; path: string } {
  if (pathname === HOME.ar) return { lang: "ar", path: "/" };
  if (pathname.startsWith(`${HOME.ar}/`)) return { lang: "ar", path: pathname.slice(HOME.ar.length) };
  return { lang: "en", path: pathname };
}

/** Where one dataset page lives: its id ("e4c/…_p6") under /dataset. */
export const pageHref = (lang: UiLang, id: string) => localePath(lang, `/dataset/${id}`);
