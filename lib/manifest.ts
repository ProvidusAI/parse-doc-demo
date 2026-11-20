import fs from "node:fs";
import path from "node:path";
import { dataUrl } from "./showcase";
import type { Manifest } from "./types";

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

/** Server-only, at build time: the page list (plus any local-only pages), from the R2 bucket when
 * NEXT_PUBLIC_DATA_URL is set, else from public/showcase. Thumb and result links point where the files live. */
export async function loadManifest(): Promise<Manifest> {
  let m: Manifest;
  if (process.env.NEXT_PUBLIC_DATA_URL) {
    const at = (f: string) => dataUrl(`/showcase/${f}`);
    m = mergeManifests((await fetchManifest(at("manifest.json"), true))!, await fetchManifest(at("manifest.local.json"), false));
  } else {
    const dir = path.join(process.cwd(), "public", "showcase");
    m = mergeManifests(read(path.join(dir, "manifest.json")) ?? EMPTY, read(path.join(dir, "manifest.local.json")));
  }
  return {
    ...m,
    categories: m.categories.map((c) => ({
      ...c,
      pages: c.pages.map((p) => ({ ...p, thumb: dataUrl(p.thumb), result: dataUrl(p.result) })),
    })),
  };
}
