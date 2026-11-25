# ProvidusBench

An open evaluation of Arabic and English document understanding, built by Providus AI. Visitors filter a dataset of real pages, open any page at its own address, and see exactly what **Providus DocAI** produced for it, from OCR to the extracted schema. Every value on the page views comes from a saved DocAI run.

**The leaderboard is hidden for now**: its page and links are removed until it has real results. `components/Leaderboard.tsx` and `lib/leaderboard.ts` are kept, but `lib/leaderboard.ts` holds SAMPLE scores (every system there except DocAI is fictional). Replace `SYSTEMS` with measured results, then bring back `app/leaderboard`, `app/ar/leaderboard` and the nav, footer and overview links.

Pages, each also under `/ar` in Arabic: `/` overview, `/dataset` (filters live in the address, e.g. `?cat=financial&has=table`), `/dataset/<page id>` one page with DocAI's output, `/methodology`.

**Try DocAI:** [platform.providus.ai](https://platform.providus.ai/)

## What it shows

1001 pages in 18 categories, from these sources:

- **94 core pages.** 21 of them, one per document type, were run through every DocAI stage: financial, government, travel & transport, media, research, statistical, legal, business, administrative, educational and other. The other 73 are industry documents (chemical, education, health, manufacturing, marine, municipality, postal, sports) that a teammate had already parsed with the E4c OCR model.
- **915 reviewed E4c pages** from the same teammate's review set.
- **297 pages added on 2026-11-20** so every category except Postal (27) and Marine (28) has at least 30 pages. Each is one page from a different public document (government, university, company and international-body PDFs), in English, Arabic or both on the same page, parsed with `docai-arabic-ocr-e4c`.

280 of these pages are not shown because they look like another page in their category: the same template or the same report layout. One page of each design stays. They are listed in `removed-pages.json`, and the site leaves them out when it reads the page list. 12 more are left out because they are blank (only a page number, a footer or a cover design); they are listed in `blank-pages.json`. Another 12 are left out because DocAI read no text from them (photos of receipts and tickets, a form, a manuscript, a chart), so their panel would be empty; they are listed in `no-text-pages.json`.

Only the 21 full-run pages show split and extract; the rest show the parse stages. The **All** tab shows every page grouped by category. Click a page to open the inspector: the page first appears on its own while DocAI's scan plays, then the panel opens on Parsed chunks, with the page on the left and the 5 DocAI stages on the right:

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

Browsers never call the bucket directly: they always ask the site for `/showcase/...`, and with the bucket set, `next.config.ts` forwards those requests to it. On Vercel the CDN caches the answers (`vercel.json` turns that on), so only the first request for a file in each region waits for `r2.dev`, which is uncached and takes 0.4–1 s per file. Every later request comes from Vercel's cache. A changed file can show for up to a day, the files' `max-age`; to see it sooner, purge the CDN cache under Vercel **Project → Settings → Caches**.

### Docker (office Mac Studio)

The site runs 24/7 in Docker on the office Mac Studio, with an ngrok link. The step-by-step setup guide (`SETUP.md`) is kept out of git and shared by hand.

**Load testing:** open `http://localhost:3000/?stress=400` to see how the grid behaves with 400 pages. The real pages are duplicated in the browser only; nothing on disk changes. The limit is 2000.

## Where the data lives

| Path | In git | What it is |
|---|---|---|
| `public/showcase/manifest.json`, `manifest.local.json` | no | The list the site renders: categories, pages, thumbnails, and each page's language, source format and content types (`lang`, `format`, `has`), which the dataset filters use. `--manifest` writes them; for a manifest written before them, `add_tiles` adds them from each `result.json` |
| `public/showcase/<category>/<type>/result.json` | no | DocAI output for one page, normalised for all 5 stages |
| `public/showcase/<category>/<type>/page.jpg`, `thumb.jpg`, `tile.jpg` | no | The page image DocAI rendered (max 2400px), its card thumbnail (480px) and the grid's small tile (160px; `--manifest` makes any that are missing) |
| `public/showcase/wall.jpg` | yes | The background wall: one tiled image of 36 corpus pages |
| `public/showcase/wall/` | no | The 160px thumbnails `wall.jpg` is built from |
| `samples.json` | yes | Which corpus page is shown for each type, its language and its review status |
| `wall.json` | yes | Corpus files used for the background wall |
| `removed-pages.json` | yes | Pages left out of the site because they look like another page in their category |
| `blank-pages.json` | yes | Pages left out of the site because they are blank (page number, footer or cover design only) |
| `no-text-pages.json` | yes | Pages left out of the site because DocAI read no text from them |
| `providus-arabic-english-dataset/` | no | The source corpus (about 660 MB), kept locally |
| `generator/out/` | no | Upload copies and the local review page |
| `public/showcase/e4c/` | no | The 915 reviewed E4c pages |
| `samples.local.json` | no | The 297 pages added later: category, source file and page, language, source URL. Set-aside pages stay listed as `rejected` |
| `public/showcase/added/` | no | The added pages' outputs |
| `providus-arabic-english-dataset/web*/` | no | The downloaded public documents the added pages come from |
| `.env.x-api-key` | no | The DocAI API key (`api-key=...`) |
| `.env` | no | R2 keys for uploading: `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `S3_API_ENDPOINT` (optional `R2_BUCKET`, default `parse-doc-demo-pages`) |

Page data is never in git. The master copy is `public/showcase/` on the machine that generates it (about 280 MB, 1009 pages); the deployed site reads the copy in the R2 bucket, where every file keeps its path (`public/showcase/e4c/<page>/result.json` → `<bucket address>/e4c/<page>/result.json`). The bucket is public; the site reads it through its own `/showcase/...` addresses (see above).

After adding or changing pages, upload them and rebuild the site. The upload needs [rclone](https://rclone.org), Node and the keys in `.env`; it only sends new or changed files and never deletes anything in the bucket:

```bash
bash scripts/upload-r2.sh
```

Only the pages listed in `manifest.json` / `manifest.local.json` are uploaded, and only they go into the Docker image (`scripts/approved-files.mjs`): a rejected page left on disk is never public. A page that is already in the bucket stays there after you reject it; remove it with `rclone delete "r2:parse-doc-demo-pages/<category>/<type>"` (same `RCLONE_CONFIG_R2_*` settings as the script).

Uploaded files carry `Cache-Control: public, max-age=86400`, so browsers keep them for a day. Files uploaded before that have no header; `bash scripts/upload-r2.sh --ignore-times` re-sends everything once to add it. With the bucket set, the site passes that header through rather than adding its own, so a missing or refused file has no cache header and a browser retries it on the next visit instead of showing a broken thumbnail for a day.

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
python3 -m generator.generate --lang ar-en                 # run a batch (skips pages already done)
python3 -m generator.generate --lang en --only travel_transport/boarding_passes --force
python3 -m generator.generate --review                     # writes generator/out/review.html
python3 -m generator.generate --manifest                   # publishes approved pages to the site
python3 -m generator.generate --wall                       # re-renders the background wall
python3 -m generator.generate --local --jobs 4             # parses samples.local.json, 4 pages at once
```

**Pages parsed elsewhere.** Entries with a `"parsed"` key (e.g. `"Chemical/01-eng"`) are not sent to DocAI. `--import-parsed` reads `<parsed>.segments.json` and `.extraction.json` from `../Industry-documents-E4c-parsed` (or `PARSED_DIR`) and the page image `sourcePath` from `../../Indusry documents` (or `PARSED_IMAGES_DIR`), then writes the same files as a DocAI run. The entry's `ocrModel` / `ocrEngine` say what was used; anything not recorded, like parse time, shows as "Not returned by DocAI".

```bash
python3 -m generator.generate --import-parsed --manifest
```

**Added pages.** `--local` parses each approved entry in `samples.local.json` with its `ocrModel` (`docai-arabic-ocr-e4c`) and skips split and extract. It then rewrites `manifest.local.json` with the review set and these pages. DocAI's worker runs one parse at a time, so `--jobs` only helps with more workers (`docker compose ... up -d --no-recreate --scale docai-core-worker=4 docai-core-worker`, started while no job is running); the OCR model server is the real limit.

Only entries with `"status": "approved"` appear on the site. To replace a page, mark the old entry `rejected`, add a new one for the same type, then run it and approve it. Image pages can carry `"redact": [[x0, y0, x1, y1], ...]` boxes, which are blacked out before upload.

## Privacy

Only pages without personal data are shown. That means no private names, ID or account numbers, faces or private signatures, and the same applies to the background wall. Where a good page contains personal details, they are redacted before the page is sent to DocAI.

## Branches

| Branch | Site | Takes pull requests from |
|---|---|---|
| `main` | [parsebench.providus.ai](https://parsebench.providus.ai) | `staging` only |
| `staging` | [bench-staging.providus.ai](https://bench-staging.providus.ai) | any work branch |

Branch your work off `staging` and open the pull request against `staging`. Once it has been checked on the staging site, open a pull request from `staging` to `main`. A pull request into `main` from any other branch fails the **Only staging into main** check (`.github/workflows/branch-flow.yml`) and cannot be merged.

## Tests

```bash
npm test                                              # site (Vitest + Testing Library)
python3 -m unittest discover -s generator/tests -t .   # generator
```

## Project layout

```
app/            Routes (English, and Arabic under app/ar), global styles and tokens, fonts (IBM Plex Sans, Plex Sans Arabic, JetBrains Mono)
components/     Site shell and nav, overview, dataset filters, page detail, inspector, stage panel, methodology
lib/            Shared types, helpers, EN/AR UI strings, manifest loader
generator/      DocAI client, page cutting, normalisation, batch runner (+ tests)
public/showcase Generated DocAI outputs served by the site
```

Built with Next.js 16, React 19 and TypeScript, using plain CSS modules.
