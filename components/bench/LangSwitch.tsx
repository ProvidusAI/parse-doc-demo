"use client";

import { LANG_COOKIE } from "@/lib/locale";

/** The nav's link to the other language. It remembers the choice, so `/` stops sending a GCC visitor who picked
 * English back to `/ar` (proxy.ts). */
export default function LangSwitch({ href, lang, label }: { href: string; lang: string; label: string }) {
  return (
    <a
      href={href}
      lang={lang}
      hrefLang={lang}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
      }}
    >
      {label}
    </a>
  );
}
