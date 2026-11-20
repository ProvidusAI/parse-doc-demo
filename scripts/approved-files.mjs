// The files of the pages on the site (listed in manifest.json / manifest.local.json), relative to public/showcase.
// A page that is on disk but not approved (rejected, or never reviewed) is never uploaded or baked into the image.
//   node scripts/approved-files.mjs          print them, one per line (rclone --files-from)
//   node scripts/approved-files.mjs --prune  delete every other file under public/showcase (Docker build only)
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(import.meta.dirname, "..", "public", "showcase");
const keep = new Set(["manifest.json", "manifest.local.json", "wall.jpg"]);
for (const name of ["manifest.json", "manifest.local.json"]) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) continue;
  for (const c of JSON.parse(fs.readFileSync(file, "utf8")).categories)
    for (const p of c.pages) for (const f of ["page.jpg", "thumb.jpg", "tile.jpg", "result.json"]) keep.add(`${p.id}/${f}`);
}

const files = fs.existsSync(dir)
  ? fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile())
  : [];
if (process.argv.includes("--prune")) {
  for (const f of files) if (!keep.has(f)) fs.rmSync(path.join(dir, f));
} else {
  for (const f of files) if (keep.has(f)) console.log(f);
}
