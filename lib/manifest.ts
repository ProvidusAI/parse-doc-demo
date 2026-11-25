import fs from "node:fs";
import path from "node:path";
import type { Manifest, ShowcaseResult } from "./types";
import blankPages from "../blank-pages.json";
import noTextPages from "../no-text-pages.json";
import removedPages from "../removed-pages.json";

const EMPTY: Manifest = { generatedAt: "", categories: [] };

const read = (file: string): Manifest | null =>
  fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Manifest) : null;

/** From the bucket. The main manifest must be there: a build without it would ship an empty site. */
async function fetchManifest(url: string, required: boolean): Promise<Manifest | null> {
  const r = await fetch(url);
  if (r.ok) return (await r.json()) as Manifest;
  if (required) throw new Error(`Could not load ${url}: HTTP ${r.status}`);
  return null;
}

/** Local-only pages (manifest.local.json, git-ignored) join their category after the committed ones. */
export function mergeManifests(base: Manifest, local: Manifest | null): Manifest {
  if (!local) return base;
  const categories = base.categories.map((c) => ({ ...c, pages: [...c.pages] }));
  for (const c of local.categories) {
    const into = categories.find((k) => k.key === c.key);
    if (into) into.pages.push(...c.pages);
    else categories.push(c);
  }
  return { ...base, categories };
}

/** The manifest without the listed pages (removed-pages.json: pages that look like another page in their category;
 * blank-pages.json: pages with nothing on them but a page number, footer or cover design; no-text-pages.json: pages
 * DocAI read no text from, so their panel would be empty). */
const HIDDEN = [...removedPages, ...blankPages, ...noTextPages];

/** The manifest without the listed pages. */
export function hidePages(m: Manifest, ids: string[]): Manifest {
  const gone = new Set(ids);
  return { ...m, categories: m.categories.map((c) => ({ ...c, pages: c.pages.filter((p) => !gone.has(p.id)) })) };
}

/** Server-only, at build time: the page list (plus any local-only pages), from the R2 bucket when
 * NEXT_PUBLIC_DATA_URL is set, else from public/showcase. Page links stay `/showcase/...` on this site either way:
 * next.config proxies them to the bucket. */
export async function loadManifest(): Promise<Manifest> {
  const bucket = (process.env.NEXT_PUBLIC_DATA_URL ?? "").replace(/\/+$/, "");
  if (bucket) {
    return hidePages(mergeManifests((await fetchManifest(`${bucket}/manifest.json`, true))!, await fetchManifest(`${bucket}/manifest.local.json`, false)), HIDDEN);
  }
  const dir = path.join(process.cwd(), "public", "showcase");
  return hidePages(mergeManifests(read(path.join(dir, "manifest.json")) ?? EMPTY, read(path.join(dir, "manifest.local.json"))), HIDDEN);
}

/** Server-only: one page's DocAI result, from the bucket or public/showcase, by its manifest link
 * (`/showcase/<id>/result.json`). Null when it can't be read, so a page can render without it. */
export async function loadResult(link: string): Promise<ShowcaseResult | null> {
  const bucket = (process.env.NEXT_PUBLIC_DATA_URL ?? "").replace(/\/+$/, "");
  try {
    if (bucket) {
      const r = await fetch(`${bucket}${link.replace(/^\/showcase/, "")}`);
      return r.ok ? ((await r.json()) as ShowcaseResult) : null;
    }
    const file = path.join(process.cwd(), "public", link);
    return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as ShowcaseResult) : null;
  } catch {
    return null;
  }
}
