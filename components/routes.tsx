// Each page exists twice, at /x and /ar/x; these render a page for either language so the route files stay one line.
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { categoryLabel, pageLabel, type UiLang } from "@/lib/i18n";
import { pageHref } from "@/lib/locale";
import { loadManifest, loadResult } from "@/lib/manifest";
import BenchFrame from "./bench/BenchFrame";
import Dataset from "./Dataset";
import Methodology from "./Methodology";
import Overview, { HERO_PAGE } from "./Overview";
import PageDetail from "./PageDetail";
import Shell from "./Shell";

export async function OverviewPage({ lang }: { lang: UiLang }) {
  const manifest = await loadManifest();
  const hero = await loadResult(`/showcase/${HERO_PAGE}/result.json`);
  return (
    <Shell lang={lang}>
      <Overview lang={lang} manifest={manifest} hero={hero} />
    </Shell>
  );
}

/** Every dataset page id, as the catch-all route's segments ("e4c/x_p6" → ["e4c", "x_p6"]). */
export async function pageParams() {
  const m = await loadManifest();
  return m.categories.flatMap((c) => c.pages.map((p) => ({ id: p.id.split("/") })));
}

async function findPage(id: string[]) {
  const m = await loadManifest();
  const want = id.map(decodeURIComponent).join("/");
  for (const c of m.categories) {
    const index = c.pages.findIndex((p) => p.id === want);
    if (index >= 0) return { m, c, index };
  }
  notFound();
}

export async function pageMetadata(lang: UiLang, id: string[]): Promise<Metadata> {
  const { c, index } = await findPage(id);
  const p = c.pages[index];
  return { title: `${pageLabel(lang, p.subCategoryLabel)} · ${categoryLabel(lang, c.key, c.label)} · ProvidusBench` };
}

export async function DatasetPagePage({ lang, id }: { lang: UiLang; id: string[] }) {
  const { m, c, index } = await findPage(id);
  const detail = <PageDetail lang={lang} category={{ key: c.key, label: c.label }} pages={c.pages} index={index} />;
  return (
    <BenchFrame lang={lang} cats={m.categories.length} other={pageHref(lang === "en" ? "ar" : "en", c.pages[index].id)}>
      {detail}
    </BenchFrame>
  );
}

export async function DatasetIndexPage({ lang }: { lang: UiLang }) {
  const manifest = await loadManifest();
  return (
    <Shell lang={lang}>
      {/* the filters come from the address, which a static page only knows in the browser */}
      <Suspense>
        <Dataset lang={lang} manifest={manifest} />
      </Suspense>
    </Shell>
  );
}

export async function MethodologyPage({ lang }: { lang: UiLang }) {
  const manifest = await loadManifest();
  return (
    <Shell lang={lang}>
      <Methodology lang={lang} manifest={manifest} />
    </Shell>
  );
}
