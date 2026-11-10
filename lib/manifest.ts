import fs from "node:fs";
import path from "node:path";
import type { Manifest } from "./types";

const EMPTY: Manifest = { generatedAt: "", wall: [], categories: [] };

/** Server-only: read the generated manifest at build time. */
export function loadManifest(): Manifest {
  const file = path.join(process.cwd(), "public", "showcase", "manifest.json");
  if (!fs.existsSync(file)) return EMPTY;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Manifest;
}
