"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { BenchData } from "@/lib/bench";
import type { UiLang } from "@/lib/i18n";
import type { PageSummary } from "@/lib/types";
import Inspector from "../Inspector";
import { geist, geistMono } from "./fonts";
import frame from "./BenchFrame.module.css";
import type { BenchCopy } from "./copy";
import { initBench } from "./motion";

/** Starts the homepage's script once the server-rendered page is in the browser, and opens a gallery page's DocAI
 * output over the gallery, as the site always has; previous / next step through the cards on show. A card is still a
 * link to the page's own address, so a new tab or a shared link works too. */
export default function BenchMotion({ data, words }: { data: BenchData; words: BenchCopy["script"] }) {
  const [open, setOpen] = useState<{ pages: PageSummary[]; index: number } | null>(null);

  useEffect(() => initBench(data, words), [data, words]);

  useEffect(() => {
    const sub = new Map(data.pages.map(([id, s]) => [id, s]));
    const summary = (id: string): PageSummary => ({
      id,
      subCategoryLabel: sub.get(id) ?? "",
      fileName: "",
      thumb: `${data.base}/showcase/${id}/thumb.jpg`,
      result: `${data.base}/showcase/${id}/result.json`,
    });
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const card = (e.target as Element | null)?.closest<HTMLAnchorElement>("a.gcard[data-id]");
      if (!card) return;
      e.preventDefault();
      const cards = [...document.querySelectorAll<HTMLAnchorElement>("a.gcard[data-id]")];
      setOpen({ pages: cards.map((c) => summary(c.dataset.id!)), index: cards.indexOf(card) });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [data]);

  return open
    ? createPortal(
        <div className={`bench ${frame.tokens} ${geist.variable} ${geistMono.variable}`} lang={words.lang} dir="ltr">
          <Inspector
            lang={words.lang as UiLang}
            pages={open.pages}
            index={open.index}
            onIndex={(index) => setOpen({ ...open, index })}
            onClose={() => setOpen(null)}
          />
        </div>,
        document.body,
      )
    : null;
}
