import fs from "node:fs";
import path from "node:path";
import type { Manifest } from "./types";

const EMPTY: Manifest = { generatedAt: "", categories: [] };

const read = (file: string): Manifest | null =>
  fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Manifest) : null;

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

/** Server-only: read the generated manifest (plus any local-only pages) at build time. */
export function loadManifest(): Manifest {
  const dir = path.join(process.cwd(), "public", "showcase");
  return mergeManifests(read(path.join(dir, "manifest.json")) ?? EMPTY, read(path.join(dir, "manifest.local.json")));
}
