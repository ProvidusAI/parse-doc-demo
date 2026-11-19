# ProvidusBench

A showcase of **Providus DocAI** on real Arabic and Arabic-English documents. Visitors browse a wall of pages by category, open any page, and step through what DocAI actually produced for it, from OCR to the extracted schema. Every value on screen comes from a saved DocAI run; nothing is mocked.

**Try DocAI:** [platform.providus.ai](https://platform.providus.ai/)

## What it shows

94 pages in 18 categories. 21 of them, one per document type, were run through every DocAI stage: financial, government, travel & transport, media, research, statistical, legal, business, administrative, educational and other. The other 73 are industry documents (chemical, education, health, manufacturing, marine, municipality, postal, sports) that a teammate had already parsed with the E4c OCR model. Those show the parse stages only; split and extract were not run on them. The **All** tab shows every page grouped by category. Click a page to open the inspector: the page first appears on its own while DocAI's scan plays, then the panel opens on Parsed chunks, with the page on the left and the 5 DocAI stages on the right:

| # | Stage | What you see |
|---|---|---|
| 1 | Parsed chunks | The OCR engine and model DocAI used, parse time and region counts, then every chunk, coloured and labelled by type on the page (hover one to highlight it). Tables are shown as tables |
| 2 | Split rules | Boundary rules DocAI suggested for the document |
| 3 | Split result | Logical documents found, page ranges, confidence, quality |
| 4 | Extract rules | The extraction schema DocAI generated (fields, types, required) |
| 5 | Extracted schema | Extracted values with confidence. Click one to see where it came from, or switch to the raw JSON |

Anything DocAI did not return is shown as *"Not returned by DocAI"*. Numbers are never filled in. The panel switches between **English and Arabic (RTL)**, and ← / → move between pages in a category. The dropdown at the end of the category bar lists every category. The magnifier button on the page turns on a lens that enlarges the page 2.5× under the cursor.

## Run it

Requires Node.js 20+.

```bash
npm install
npm run dev            # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

The site is fully static and never calls DocAI at runtime. It reads the saved DocAI outputs from one of two places:

| `NEXT_PUBLIC_DATA_URL` | Page list, images and results come from |
|---|---|
| not set (local default) | `public/showcase/` on this machine |
| the R2 bucket's public address, e.g. `https://pub-c99bc626b15545bab2dacce930228a2f.r2.dev` | the Cloudflare R2 bucket `parse-doc-demo-pages` |

The page list is read when the site is **built**, so a change to the data address or to the pages needs a rebuild. On Vercel, set `NEXT_PUBLIC_DATA_URL` under **Project → Settings → Environment Variables**, then redeploy. Locally, put it in `.env.local` to try the R2 data.

### Docker (office Mac Studio)

The site runs 24/7 in Docker on the office Mac Studio, with an ngrok link. The step-by-step setup guide (`SETUP.md`) is kept out of git and shared by hand.

**Load testing:** open `http://localhost:3000/?stress=400` to see how the grid behaves with 400 pages. The real pages are duplicated in the browser only; nothing on disk changes. The limit is 2000.

## Where the data lives

| Path | In git | What it is |
|---|---|---|
| `public/showcase/manifest.json`, `manifest.local.json` | no | The list the site renders: categories, pages, thumbnails |
| `public/showcase/<category>/<type>/result.json` | no | DocAI output for one page, normalised for all 5 stages |
| `public/showcase/<category>/<type>/page.jpg`, `thumb.jpg` | no | The page image DocAI rendered (max 2400px) and its card thumbnail |
| `public/showcase/wall.jpg` | yes | The background wall: one tiled image of 36 corpus pages |
| `public/showcase/wall/` | no | The 160px thumbnails `wall.jpg` is built from |
| `samples.json` | yes | Which corpus page is shown for each type, its language and its review status |
| `wall.json` | yes | Corpus files used for the background wall |
| `providus-arabic-english-dataset/` | no | The source corpus (about 660 MB), kept locally |
| `generator/out/` | no | Upload copies and the local review page |
| `public/showcase/e4c/` | no | The 915 reviewed E4c pages |
| `.env.x-api-key` | no | The DocAI API key (`api-key=...`) |
| `.env` | no | R2 keys for uploading: `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `S3_API_ENDPOINT` (optional `R2_BUCKET`, default `parse-doc-demo-pages`) |

Page data is never in git. The master copy is `public/showcase/` on the machine that generates it (about 280 MB, 1009 pages); the deployed site reads the copy in the R2 bucket, where every file keeps its path (`public/showcase/e4c/<page>/result.json` → `<bucket address>/e4c/<page>/result.json`). The bucket is public and lets any site read it (CORS: GET from any origin).

After adding or changing pages, upload them and rebuild the site. The upload needs [rclone](https://rclone.org) and the keys in `.env`; it only sends new or changed files and never deletes anything in the bucket:

```bash
bash scripts/upload-r2.sh
```

DocAI itself keeps its copies of the uploaded pages in its own local Docker volumes and database.

## Regenerating the data

`generator/` is a small Python tool (standard library plus `pypdfium2` and `Pillow`). It runs each page in `samples.json` through a **local DocAI** stack: upload, parse, segments, split rules, split, schema, extraction. It then writes the files above.

**Prerequisites**

- DocAI running locally, with the middleware on `http://localhost:8787`. Override with `DOCAI_BASE_URL`.
- A DocAI API key in `.env.x-api-key` (`api-key=docai_...`) or in `DOCAI_API_KEY`.
- Credits on the DocAI organisation.

**OCR engine per language**

| `lang` in samples.json | OCR model | DocAI engine (`DOCAI_OCR_ENGINE`) |
|---|---|---|
| `ar-en` | `docai-arabic-ocr-e4c` | default (GLM) |
| `en` | `translate-studio/paddleocr-vl-1.6` | `paddle-vl` |

The generator asks DocAI which engine it is running. It refuses a batch on the wrong engine and prints what to set. To switch engines, edit `DOCAI_OCR_ENGINE` / `DOCAI_OCR_MODEL` in DocAI's `local-dev/.env.dev`. Then recreate the containers with `bash local-dev/dev-up.sh -d`; editing the file alone is not enough.

**Commands**

```bash
python -m generator.generate --lang ar-en                 # run a batch (skips pages already done)
python -m generator.generate --lang en --only travel_transport/boarding_passes --force
python -m generator.generate --review                     # writes generator/out/review.html
python -m generator.generate --manifest                   # publishes approved pages to the site
python -m generator.generate --wall                       # re-renders the background wall
```

**Pages parsed elsewhere.** Entries with a `"parsed"` key (e.g. `"Chemical/01-eng"`) are not sent to DocAI. `--import-parsed` reads `<parsed>.segments.json` and `.extraction.json` from `../Industry-documents-E4c-parsed` (or `PARSED_DIR`) and the page image `sourcePath` from `../../Indusry documents` (or `PARSED_IMAGES_DIR`), then writes the same files as a DocAI run. The entry's `ocrModel` / `ocrEngine` say what was used; anything not recorded, like parse time, shows as "Not returned by DocAI".

```bash
python -m generator.generate --import-parsed --manifest
```

Only entries with `"status": "approved"` appear on the site. To replace a page, mark the old entry `rejected`, add a new one for the same type, then run it and approve it. Image pages can carry `"redact": [[x0, y0, x1, y1], ...]` boxes, which are blacked out before upload.

## Privacy

Only pages without personal data are shown. That means no private names, ID or account numbers, faces or private signatures, and the same applies to the background wall. Where a good page contains personal details, they are redacted before the page is sent to DocAI.

## Tests

```bash
npm test                                              # site (Vitest + Testing Library)
python -m unittest discover -s generator/tests -t .   # generator
```

## Project layout

```
app/            Next.js app router entry, global styles, fonts
components/     Landing, page wall, dataset browser, inspector, 7-stage panel
lib/            Shared types, helpers, EN/AR UI strings, manifest loader
generator/      DocAI client, page cutting, normalisation, batch runner (+ tests)
public/showcase Generated DocAI outputs served by the site
```

Built with Next.js 16, React 19 and TypeScript, using plain CSS modules.
