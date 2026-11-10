# ProvidusBench Site Implementation Plan


**Goal:** A Next.js showcase styled like parsebench.ai, where each of 21 clean corpus pages opens an inspector showing the real DocAI output for the 7 pipeline stages.

**Architecture:** A Python generator (`generator/`) drives the local DocAI Bun API and writes static outputs to `public/showcase/`: page images, thumbnails, one `result.json` per page, and a `manifest.json`. The Next.js app reads the manifest at build time and fetches `result.json` only when the inspector opens. The site never calls DocAI.

**Tech Stack:** Next.js 16 (App Router, TypeScript, React 19), plain CSS (`globals.css` tokens plus CSS modules), Vitest and Testing Library with jsdom. The generator uses Python 3.14 with the stdlib (`urllib`, `unittest`), plus `pypdfium2` and `Pillow`, which are already installed.

**Spec:** `docs/specs/2026-11-10-providusbench-site-design.md`. Mockup reference: the accepted local mockup (not committed), which is the accepted look. Copy its CSS values freely.

## Global Constraints

- All work is on branch `feature/frontend`. `main` and `development-branch` never get code. Nothing is pushed.
- Commits use a short subject (`feat:`/`fix:`/`chore:`/`docs:`/`test:`) plus 1–4 terse bullet lines.
- **No made-up numbers.** Every value the UI shows comes from `result.json`. If a field is `null`, the UI shows the text "Not returned by DocAI" in `--t3`. It never shows a placeholder value.
- Tokens: bg `#fff`, fg `#000`, `--t2 #404040`, `--t3 #737373`, `--muted #f5f5f5`, `--border #e7e7e7`, `--ring #0077c7`, `--veil rgba(250,250,252,.88)`.
- Radius is 0, except the round arrows and close button.
- H1 is 72px / 500 / −0.03em / 1.02. The lead paragraph is 18px / 1.62 / `#404040`.
- Buttons are 40px tall, mono 12px uppercase, letter-spacing .1em.
- Nav is 64px tall, white at 90% with blur(24px). The toolbar is white at 85% with blur(12px).
- Fonts load through `next/font/google`:
  - **Inter Tight** (400/500/600) stands in for Overused Grotesk, which isn't on npm. This is a deliberate simplification; switch to `next/font/local` if a licensed woff2 is supplied.
  - **IBM Plex Mono** (400/500).
  - **IBM Plex Sans Arabic** (400/500).
- Animations: `fade-in` (opacity 0, translateY 8px), `bounce`, `aurora-drift`, scan-line. All of them are turned off under `prefers-reduced-motion: reduce`.
- OCR model by `lang`: `ar-en` → `docai-arabic-ocr-e4c`; `en` → `translate-studio/paddleocr-vl-1.6`. Parse options are `{"backend":"glm-ocr","ocr_model":<model>,"force":true}`, which forces the OCR lane.
- The DocAI job record does not report the OCR model id. The Upload stage therefore shows the `backend` that DocAI reports, and labels the model "OCR model (requested)", using the value the generator sent.
- Personal data: no shown page or wall thumbnail may contain private names, ID/VAT/account numbers, faces or private signatures.
- Never commit `providus-arabic-english-dataset/`, `design.md/`, `.scratch/`, `generator/out/`, or anything holding the API key. The key comes from `DOCAI_API_KEY` or the git-ignored `.env.x-api-key` (`api-key=`), and is never printed. The base URL comes from `DOCAI_BASE_URL`, default `http://localhost:8080`.

## Verified against the running DocAI (2026-11-10 smoke runs)

- The whole pipeline works locally. A receipt took about 90s and an Arabic invoice about 2.5 min (parse, rules, split, schema, extract), so 21 pages is roughly 45 min.
- `docai-arabic-ocr-e4c` reads Arabic correctly under the **current** engine (`resolved_ocr_engine: glm`), even though DocAI labels it non-matching. The `ar-en` batch therefore needs **no engine switch**. Only the `en` batch switches, to `DOCAI_OCR_ENGINE=paddle-vl` with `DOCAI_OCR_MODEL=translate-studio/paddleocr-vl-1.6`, which is the exact LM Studio id.
- Uploading the same filename twice returns `409 duplicate_filename`. Uploads are therefore named `<sub-category>-<runid6>-<original name>`.
- The parse response is `{jobId, job:{job_id,...}}`.
- `job.result.usage` = `{ocr:{calls,failures}, vlm:{calls,failures}, backend, elapsed_seconds, billing}`.
- Citation `path` is a **schema field-id path** (e.g. `/field-root-merchant-name`), not a `jsonResult` key. Map it through the schema's `fields[].id`, which is nested by `children`.
- Table segments' `markdown` is an HTML `<table>`.
- The dev org starts with 0 credits. They were granted per `local-dev/TESTING.md` §2b.
- Filenames lie about language: `003_receipt_arabic-english.jpg` is English-only. Set `lang` by looking at the page.
- The API key lives in the git-ignored `providus-bench.ai/.env.x-api-key` as `api-key=...`. The generator reads it from there, and `DOCAI_API_KEY` overrides it.

## Review Focus

1. **A DocAI field is missing.** For example, `usage` is absent on a reused parse, a split or extract operation failed, or the citations list is empty. The page still opens, and each affected stage shows "Not returned by DocAI". Tests: Task 2 `test_missing_usage_and_failed_ops`, Task 8 `renders null stages`.
2. **Odd boxes.** These include textless segments (logo, stamp, signature), boxes outside 0–1000 from the `pixel_bbox` fallback, and citations whose `segmentId` matches no segment. Textless boxes are still drawn, boxes are clamped, and unmatched citations show without a box. Tests: Task 2 `test_citation_without_segment`, Task 4 `boxToPercent clamps`.
3. **Mixed Arabic/English text inside an English (LTR) or Arabic (RTL) UI.** Every DocAI text node gets `dir="auto"`, so each line takes its own direction. Test: Task 8 `chunk text uses dir auto`.
4. **A category with one page, and a search that matches nothing.** The arrows wrap onto the same page without errors. An empty search shows "No pages match". Tests: Task 4 `nextIndex wraps single page`, Task 6 `empty search state`.
5. **The generator is interrupted, or one entry fails.** Nothing partial is written: `result.json` is written only once all stages finish. A rerun skips finished entries and retries failed ones. Test: Task 3 `test_skip_existing_and_no_partial_write`.

---

## File map

```
providus-bench.ai/
  samples.json                   # one entry per sub-category (hand-edited, committed)
  wall.json                      # corpus files allowed in the decorative wall (committed)
  generator/
    __init__.py
    pages.py                     # cut one page → upload file; thumbnails
    normalize.py                 # raw DocAI responses → result dict (pure)
    docai_client.py              # tiny urllib client: upload, parse, poll, ops, artifacts
    generate.py                  # CLI: runs a batch, writes outputs + review.html + manifest
    tests/test_pages.py, test_normalize.py, test_generate.py, fixtures/*.json
  public/showcase/               # generated, committed after review
    manifest.json
    <category>/<sub>/page.png, thumb.jpg, result.json
    wall/w000.jpg …
  app/layout.tsx, app/page.tsx, app/globals.css
  lib/types.ts, lib/showcase.ts, lib/i18n.ts, lib/showcase.test.ts
  components/Nav.tsx, PageWall.tsx, Hero.tsx, Showcase.tsx, DatasetBrowser.tsx,
             Inspector.tsx, PageView.tsx, StagePanel.tsx, stages.tsx (+ *.module.css)
  components/*.test.tsx
```

## Shared data contract

The generator writes this contract and the site reads it. Every task uses it.

```ts
// lib/types.ts  (generator/normalize.py emits exactly these keys)
export type Box = { page: number; x0: number; y0: number; x1: number; y1: number }; // ints 0–1000, top-left origin
export type Lang = 'ar-en' | 'en';
export interface Segment { id: string; type: string; label: string; text: string; textless: boolean; box: Box | null }
export interface ShowcaseResult {
  id: string;                         // "financial/receipts"
  category: string; categoryLabel: string; subCategory: string; subCategoryLabel: string;
  lang: Lang;
  source: { fileName: string; page: number };
  page: { image: string; thumb: string; width: number; height: number };   // paths under /showcase
  upload: { fileName: string; mimeType: string; bytes: number; pageCount: number;
            backend: string | null; ocrModel: string; elapsedSeconds: number | null };
  segments: Segment[];
  splitRules: { id: string; name: string; description: string }[] | null;
  split: { records: { id: string; title: string; documentType: string | null; startPage: number; endPage: number;
                      confidence: 'high' | 'medium' | 'low' | null; boundaryReason: string | null }[];
           qualityStatus: 'pass' | 'review' | 'fail'; coverage: number } | null;
  schema: { title: string; fields: { name: string; type: string; required: boolean; description: string }[] } | null;
  extraction: { json: unknown; values: { path: string; value: string; confidence: number | null;
                segmentId: string | null; box: Box | null }[] } | null;
  models: { split: string | null; extract: string | null };
}
export interface PageSummary { id: string; subCategoryLabel: string; fileName: string; thumb: string; result: string }
export interface Manifest { generatedAt: string; wall: string[];
  categories: { key: string; label: string; pages: PageSummary[] }[] }
```

`samples.json` entry: `{ "category": "financial", "categoryLabel": "Financial", "subCategory": "receipts", "subCategoryLabel": "Receipts", "sourcePath": "financial/receipts/003_receipt_arabic-english.jpg", "page": 1, "lang": "ar-en", "status": "candidate"|"approved"|"rejected", "note": "" }`. Paths are relative to `providus-arabic-english-dataset/`. The order of entries sets the order of tabs and pages.

---

### Task 1: Next.js scaffold, tokens, fonts, test runner

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/types.ts`, `lib/smoke.test.ts`
- Modify: `.gitignore` (add `generator/out/`, `__pycache__/`)

**Interfaces:**
- Produces:
  - Everything in `lib/types.ts` above.
  - CSS variables `--bg --fg --t2 --t3 --muted --border --ring --veil --sans --mono --arabic` and keyframes `fade-in bounce aurora-drift scan` in `globals.css`.
  - Font CSS variables set on `<html>`.

- [ ] **Step 1:** Scaffold by hand. Do not use `create-next-app`, because the folder already has content.
  - Dependencies: `next@16.4.6 react react-dom`.
  - Dev dependencies: `typescript @types/react @types/node vitest@4 @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`.
  - Scripts: `dev`, `build`, `start`, `test: vitest run`.
- [ ] **Step 2:** Write `lib/smoke.test.ts`, asserting `expect(1).toBe(1)`. Run `npm test`. Expected: 1 passed.
- [ ] **Step 3:** Write `globals.css`. Copy the tokens and keyframes from the mockup, plus the reduced-motion block and `body { background: var(--bg) }`. Set fonts in `layout.tsx`. `<html lang="en">` sets the `--sans`, `--mono` and `--arabic` variables.
- [ ] **Step 4:** Make `app/page.tsx` render a placeholder `<h1>ProvidusBench</h1>`. Run `npm run build`. Expected: build succeeds.
- [ ] **Step 5:** Commit: `chore: scaffold Next.js app` with bullets for the tokens, fonts and vitest.

### Task 2: Page cutting, thumbnails, and normalization

**Files:**
- Create: `generator/pages.py`, `generator/normalize.py`, `generator/tests/test_pages.py`, `generator/tests/test_normalize.py`, `generator/tests/fixtures/{segments,job,rules,split,schema,extract}.json`

**Interfaces:**
- `cut_page(src: Path, page: int, dst_dir: Path) -> Path`, by file type:
  - PDF: a one-page PDF (pypdfium2 `PdfDocument.new()` + `import_pages`).
  - `.webp`: PNG via Pillow.
  - `.jpg`/`.png`: copied as is.
  - `.docx`: raises `ValueError("docx not supported, pick another file")`.
- `make_thumb(img_bytes_or_path, dst: Path, width: int) -> None`: JPEG at quality 72. Cards use `width=480`; the wall uses `width=160`.
- `render_wall_thumb(src: Path, dst: Path) -> None`: renders PDF page 1 or opens the image, then calls `make_thumb` with width 160.
- `build_result(entry, *, file_meta, job, segments, page_png: bytes, rules, split, schema, extraction) -> dict` returns exactly the `ShowcaseResult` keys, with paths `"/showcase/<id>/page.png"` and `"/showcase/<id>/thumb.jpg"`. It maps the DocAI responses as follows:
  - Segment boxes:
    - `coordinates.{xmin,ymin,xmax,ymax}` are clamped to 0–1000.
    - `box` is `null` when the coordinates are missing.
    - `text` comes from `markdown`, and `label` from `title`.
  - `upload.backend` and `upload.elapsedSeconds` come from `job.result.usage`. When `usage` is absent, both are `None`.
  - Extraction values:
    - Walk `jsonResult` into leaf `path → str(value)` pairs.
    - Map each citation `path` (a field-id path such as `/field-root-merchant-name`) to the field's name path using `schema.fields[].id`, nested through `children`. Then attach the citation to that leaf, taking its `confidence` and `segmentId`.
    - Fill `box` by looking up that segment.
    - Leave unmatched citations with `box: null`.

- [ ] **Step 1: Write the failing tests.**
  - `test_cut_pdf_page` makes a 3-page PDF in a temp dir with pypdfium2, cuts page 2, and asserts the output has 1 page.
  - `test_cut_docx_raises`.
  - `test_normalize_full` takes the fixtures and asserts:
    - `result["segments"][0]["box"] == {"page":1,"x0":..}`, using the exact values from the fixture.
    - `result["split"]["qualityStatus"] == "pass"`.
    - `result["extraction"]["values"]` contains `{"path":"total_amount","value":"1150.00","confidence":0.97, ...}`.
  - `test_missing_usage_and_failed_ops`:
    - `job` has no `usage`, and `split=None` and `extraction=None` are passed in.
    - Assert `upload.backend is None` and `split is None`.
  - `test_citation_path_maps_field_id`: citation path `/field-root-merchant-name`, with the schema field `{id:"field-root-merchant-name", name:"merchant_name"}`, attaches to the value `merchant_name`.
  - `test_citation_without_segment`: a `segmentId` not found in the segments gives `box is None`.
  - `test_box_clamped`: `xmax: 1200` becomes `1000`.

  Base the fixtures on the API shapes: segments use `coordinates` with 0–1000 integers; split records carry `confidence` `"high"`; citations are `{path, segmentId, pageNumber, quote, confidence}`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement `pages.py` and `normalize.py`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(generator): page cutting, thumbnails, result normalization`.

### Task 3: Generator CLI, client, and resumable runs

**Files:**
- Create: `generator/__init__.py`, `generator/docai_client.py`, `generator/generate.py`, `generator/tests/test_generate.py`

**Interfaces:**
- Consumes: `pages.cut_page`, `pages.make_thumb`, `normalize.build_result` (Task 2).
- Produces the CLI: `python -m generator.generate --lang {ar-en,en} [--only <id>] [--force] [--review] [--manifest]`.
- `DocAI(base_url: str, api_key: str)` has these methods. Every one sends the `x-api-key` header, and every one raises `DocAIError` when the status is not 2xx.
  - `upload(path, name) -> file_id`: `POST /v1/files` multipart, field `file` with the unique upload `name`, `auto_parse=false`. Returns `file.id`.
  - `parse(file_id, options) -> job_id`: `POST /v1/files/{id}/parse` with `{options}`.
  - `wait_job(file_id, job_id, timeout=900) -> job`: polls `GET /v1/files/{id}/jobs/{job}` until `completed` and raises on `failed` or `cancelled`. Polling starts every 2s, backs off ×1.5, and caps at 10s.
  - `segments(file_id) -> list`
  - `page_image(file_id) -> bytes`: `GET page-images`, then GET `pages[0]`.
  - `run_op(path, body, timeout=900) -> output`: POSTs, treats a 200 response as the output itself, and on 202 polls `GET /v1/operations/{id}` until `completed`, raising on `failed` or `cancelled`.
- `run_entry(entry, client, out_dir, force=False) -> Path`. Order of calls:
  1. `upload`
  2. `parse`, then `wait_job`
  3. `segments` and `page_image`
  4. `run_op('/v1/split/rules/suggest', {file_id})`
  5. `run_op('/v1/split/runs', {file_id, rules})`. Skip this when there are no rules.
  6. `run_op('/v1/extract/schemas/generate', {file_id})`
  7. `run_op('/v1/extract/runs', {file_id, schema})`
- How `run_entry` handles failures:
  - A failure in split or extract stores `None` for that stage. It does not abort the entry (Review Focus 1).
  - An upload or parse failure aborts the entry.
  - It writes `page.png` and `thumb.jpg` (width 480) to `public/showcase/<id>/`.
  - It writes to `<out>/<id>/result.json.tmp` and then renames into place, so it writes atomically.
  - It skips an entry when `result.json` already exists, unless `force` is set.
- The batch runs only entries where `entry.lang == --lang` and `status != "rejected"`.
- Before the batch starts, it prints the engine to set:
  - `ar-en`: the current GLM engine, with no change needed.
  - `en`: `DOCAI_OCR_ENGINE=paddle-vl`, `DOCAI_OCR_MODEL=translate-studio/paddleocr-vl-1.6`.
  - Remind the operator to edit `models.ocr.model` too and restart the worker.

- [ ] **Step 1: Write the failing tests.** They use `unittest.mock`, with a fake client object, not HTTP.
  - `test_skip_existing_and_no_partial_write`:
    - When `result.json` exists, the fake client is never called.
    - When the fake `parse` raises, no `result.json` or `.tmp` file remains.
  - `test_split_failure_keeps_entry`:
    - The fake `run_op` raises for `/v1/split/runs`.
    - `result.json` is still written, with `"split": null`.
  - `test_batch_filters_lang_and_rejected`: of 3 entries, only the `ar-en`, non-rejected one is run.
- [ ] **Step 2:** Run `python -m unittest discover -s generator/tests -v`. Expected: FAIL, because of an import error.
- [ ] **Step 3:** Implement `docai_client.py` and `generate.py` with the signatures above. For `run_op`, extract the poll as `poll(fn, done, timeout)` so the tests can stub `time.sleep`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(generator): DocAI client and resumable batch runner`.

### Task 4: Site data helpers and UI strings

**Files:**
- Create: `lib/showcase.ts`, `lib/i18n.ts`, `lib/showcase.test.ts`
- Delete: `lib/smoke.test.ts`

**Interfaces:**
- `loadManifest(): Manifest`: server-only. It reads `public/showcase/manifest.json` with `fs`. When the file is missing it returns `{generatedAt:"", wall:[], categories:[]}`.
- `nextIndex(i: number, n: number, dir: 1 | -1): number`: wraps around.
- `filterPages(pages: PageSummary[], q: string): PageSummary[]`: a case-insensitive match on `subCategoryLabel` or `fileName`.
- `boxToPercent(b: Box): { left: string; top: string; width: string; height: string }`: clamps to 0–1000 and returns percentage strings.
- `t(lang: 'en' | 'ar', key: UiKey): string`: `UiKey` covers every fixed UI label. That includes the 7 stage names, "Category", "Step {n} of 7", "Not returned by DocAI", "No pages match", and the hint text. Both languages are required by the type.

- [ ] **Step 1: Write the failing tests.**
  - `nextIndex wraps`: `nextIndex(3,4,1) === 0` and `nextIndex(0,4,-1) === 3`.
  - `nextIndex wraps single page`: `nextIndex(0,1,1) === 0`.
  - `filterPages` matches "receipt" against "Receipts".
  - `boxToPercent clamps`: `{x0:-5,y0:0,x1:1200,y1:500}` becomes `{left:'0%',top:'0%',width:'100%',height:'50%'}`.
  - `t('ar','stage.upload')` is non-empty and differs from the English string.
  - `loadManifest` with no file returns an empty `categories` array. Mock `fs.existsSync`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Write the Arabic strings in natural Modern Standard Arabic.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: showcase data helpers and EN/AR UI strings`.

### Task 5: Landing page: nav, page wall, hero, scroll choreography

**Files:**
- Create: `components/Nav.tsx`, `components/PageWall.tsx`, `components/Hero.tsx`, `components/Showcase.tsx` (client), their `*.module.css` files, and `components/Showcase.test.tsx`
- Modify: `app/page.tsx` (server component: `loadManifest()` → `<Showcase manifest={m} />`)

**Interfaces:**
- `Showcase({ manifest }: { manifest: Manifest })` owns this state:
  - `progress` (0–1), from `scrollY / 420`.
  - `activeCategory`.
  - `openId: string | null`.
- It sets `data-on-data` on its root when `progress > 0.85`.
- Hero stats are computed from the manifest:
  - number of categories,
  - total number of pages, labelled "Document types",
  - `7`,
  - `AR·EN`.
- Hero copy, text verbatim from the mockup:
  - H1: "Document intelligence that reads Arabic"
  - Arabic line: "ذكاء المستندات باللغتين العربية والإنجليزية"
  - Lead: "Real pages from a bilingual corpus, each run end-to-end through Providus DocAI: layout parsing, OCR, grounded chunks, splitting and schema extraction, all on our own models."
- `PageWall({ thumbs }: { thumbs: string[] })`:
  - A fixed CSS grid using `repeat(auto-fill, minmax(70px, 1fr))`.
  - Thumbnails are repeated to fill about 260 cells, with `loading="lazy"` and `aria-hidden`.
  - Its blur is `progress * 4px`.
- `Hero`:
  - Sits on the veil with `blur(6px)`.
  - Uses `opacity: 1 - progress` and `translateY(-progress * 40px)`.
  - Turns pointer events off when progress > 0.6.
  - "Explore the pages" smooth-scrolls to `600px`.

- [ ] **Step 1: Write the failing test.** `Showcase.test.tsx` covers:
  - `hero shows manifest counts`: with a 2-category, 3-page fixture manifest, the text `2` appears next to "Categories" and `3` next to "Document types".
  - `scroll sets data-on-data`: set `window.scrollY = 500`, fire `scroll`, and expect the root to have the `data-on-data` attribute.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Port the mockup's CSS for the nav, wall, hero, pipeline list and scroll mouse into the CSS modules.
- [ ] **Step 4:** Run `npm test`. Expected: PASS. Then run `npm run build`. Expected: success.
- [ ] **Step 5:** Commit: `feat: landing hero, page wall and scroll choreography`.

### Task 6: Dataset browser: category tabs, search, grid and fit view

**Files:**
- Create: `components/DatasetBrowser.tsx`, `components/DatasetBrowser.module.css`, `components/DatasetBrowser.test.tsx`
- Modify: `components/Showcase.tsx` (render it and pass `activeCategory`, `onOpen(id)`)

**Interfaces:**
- `DatasetBrowser({ manifest, active, onActive, onOpen }: { manifest: Manifest; active: string; onActive(k: string): void; onOpen(id: string): void })`.
- The toolbar is fixed at `top: 64px`. It has:
  - One chip per category, labelled with the category name and a mono count.
  - A search input.
  - A Grid / Fit page toggle. Fit uses `minmax(420px, 1fr)` instead of `minmax(210px, 1fr)`.
- The section heading reads `"{label}"` followed by `"{n} document types · 1 page each"`.
- Cards are `<button>`s showing the thumbnail and the sub-category label. They animate in with a 70ms stagger.

- [ ] **Step 1: Write the failing tests.**
  - `tabs switch category`: clicking the "Government" chip calls `onActive('government')`.
  - `card opens inspector`: clicking the "Receipts" card calls `onOpen('financial/receipts')`.
  - `empty search state`: typing "zzz" shows "No pages match".
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Port the mockup's toolbar, chip, card and hint styles.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: dataset browser with category tabs and search`.

### Task 7: Inspector modal and page view with boxes

**Files:**
- Create: `components/Inspector.tsx`, `components/PageView.tsx`, `*.module.css`, `components/Inspector.test.tsx`
- Modify: `components/Showcase.tsx`

**Interfaces:**
- `Inspector({ pages, index, onIndex, onClose }: { pages: PageSummary[]; index: number; onIndex(i: number): void; onClose(): void })`:
  - Fetches `pages[index].result` and holds a `ShowcaseResult`.
  - Keyboard: Esc calls `onClose`. → calls `onIndex(nextIndex(index, n, 1))`. ← does the same with `-1`.
  - Locks body scroll while open.
  - Uses `role="dialog"` and `aria-modal="true"`, and moves focus to the close button.
- `PageView({ result, boxes, highlight, scanning }: { result: ShowcaseResult; boxes: { key: string; box: Box }[]; highlight: string | null; scanning: boolean })`:
  - Renders the image, then one absolutely positioned div per box using `boxToPercent`. Only boxes on page 1 are drawn.
  - The highlighted box gets the class `hi`.
  - Shows the scan-line animation when `scanning` is true.
  - The meta line underneath is `fileName`, then `"{categoryLabel} · {subCategoryLabel} · {i} of {n}"`.
- `StagePanel` is a placeholder until Task 8.

- [ ] **Step 1: Write the failing tests.** Mock `fetch` to return the fixture result.
  - `arrow keys move within category`: with 3 pages at index 2, pressing → calls `onIndex(0)`.
  - `escape closes`.
  - `meta shows position`: "Financial · Receipts · 1 of 4".
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Port the mockup's modal, page, arrow and close-button CSS. The page width is `min(100%, calc((100vh - 170px) * .75))`, with aspect ratio from `page.width/page.height`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: inspector modal with grounded page view`.

### Task 8: Stage panel: 7 stages and the EN/AR toggle

**Files:**
- Create: `components/StagePanel.tsx`, `components/stages.tsx`, `components/StagePanel.module.css`, `components/StagePanel.test.tsx`
- Modify: `components/Inspector.tsx` (wire up the boxes, highlight and scanning)

**Interfaces:**
- `StagePanel({ result, onBoxes, onHighlight }: { result: ShowcaseResult; onBoxes(b: { key: string; box: Box }[]): void; onHighlight(key: string | null): void })`:
  - Internal state is `step` (0–6) and `uiLang` ('en' | 'ar').
  - Setting `uiLang='ar'` puts `dir="rtl"` and `lang="ar"` on the panel root.
  - It resets to step 0 when `result.id` changes.
- Stage components live in `stages.tsx`. Each one takes `{ result, lang, onHighlight }`.
  - `UploadStage`: file name, mime type, bytes, page count, backend, "OCR model (requested)" and elapsed seconds.
  - `OcrStage`: sets `scanning`. Shows every segment box, a count of regions by type, and a list of regions.
  - `ChunksStage`: a list where hovering or focusing a row calls `onHighlight(segment.id)`.
  - `SplitRulesStage`: read-only switches (`aria-checked="true"`, disabled).
  - `SplitResultStage`: records with page range and `confidence`, plus a pill showing `qualityStatus`.
  - `ExtractRulesStage`: field name, type badge and REQ marker.
  - `ExtractedStage`: a Fields/JSON toggle. Clicking a value with a `box` calls `onHighlight`. The confidence badge appears only when the value is non-null.
- Any stage whose data is `null` renders `t(lang, 'notReturned')`.
- A segment whose `markdown` holds an HTML `<table>` is shown as plain cell text joined with ` · `. Strip the tags and never inject the HTML.
- Every DocAI text node gets `dir="auto"` and the class `ar` when it contains Arabic. Detect Arabic with `/[؀-ۿ]/`.
- The stepper styles done, current and pending steps differently, scrolls the active step into view, and lets any step be clicked. The footer reads `t('stepOf')`.

- [ ] **Step 1: Write the failing tests.**
  - `clicking a step switches body`: click "Split result" and see "Split result" as the heading.
  - `renders null stages`: with a fixture where `split` and `extraction` are `null`, steps 5 and 7 show "Not returned by DocAI".
  - `chunk hover highlights`: hovering a chunk row calls `onHighlight('seg-1')`.
  - `chunk text uses dir auto`.
  - `arabic toggle flips direction`: clicking العربية makes the root `dir="rtl"` and the stage name text Arabic.
  - `no invented confidence`: a value with `confidence: null` renders no `%` badge.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Port the mockup's panel, stepper, row, field, pill, toggle and aurora styles.
- [ ] **Step 4:** Run `npm test`. Expected: PASS. Then run `npm run build`. Expected: success.
- [ ] **Step 5:** Commit: `feat: 7-stage DocAI panel with EN/AR toggle`.

### Task 9: Choose clean samples and wall files (with the user)

**Files:**
- Create: `samples.json`, `wall.json`
- Modify: `generator/generate.py` (add `--wall`, which renders `wall.json` files to `public/showcase/wall/w###.jpg`)

- [ ] **Step 1:** For each of the 20 sub-category folders plus `other`, view candidate pages with the Read tool and pick one with **no personal data** (Global Constraints). Set `lang` by looking at the page: Arabic present means `ar-en`, otherwise `en`. Skip `.docx`. For long reports, pick the first page with real content.
- [ ] **Step 2:** Choose about 40 clean corpus files for `wall.json`: reports, regulations, papers, newspapers and notices. They are repeated to fill the wall.
- [ ] **Step 3:** Run `python -m generator.generate --wall`. Expected: `public/showcase/wall/` holds about 40 JPEGs, each 160px wide.
- [ ] **Step 4:** Show the user the picks (file path and why each is clean) and wait for their OK.
- [ ] **Step 5:** Commit: `chore: select clean showcase samples and wall pages`.

### Task 10: Run DocAI and review the outputs (operator task, needs the user)

**Prerequisites (already done 2026-11-10):**
- The DocAI dev stack is up.
- The API key is in `.env.x-api-key`.
- The org has credits.

- [ ] **Step 1:** The `ar-en` batch uses the current engine, so no switch is needed. Run `python -m generator.generate --lang ar-en`. Expected: every `ar-en` entry prints `ok` or `skipped`.
- [ ] **Step 2:** Ask the user to switch to `DOCAI_OCR_ENGINE=paddle-vl` and `DOCAI_OCR_MODEL=translate-studio/paddleocr-vl-1.6` (in `.env.dev` and `models.ocr.model`), and to run `bash local-dev/dev-up.sh -d` again. Afterwards, switch back the same way. Then run `python -m generator.generate --lang en`.
- [ ] **Step 3:** Run `python -m generator.generate --review`, which writes `generator/out/review.html`. Open it in the browser pane. The user marks entries `approved` or `rejected` (with a `note`) in `samples.json`. For each rejected entry, pick another clean file from the same sub-category and repeat Steps 1–3 for that `--only <id>`.
- [ ] **Step 4:** Run `python -m generator.generate --manifest`, which writes `public/showcase/manifest.json` from the approved entries only, plus the wall list.
- [ ] **Step 5:** Commit: `feat: add reviewed DocAI showcase outputs`. Bullets: N pages, which models, review date.

### Task 11: Final check against the mockup

- [ ] **Step 1:** Run `npm run build && npm start`. In the browser pane, open `http://localhost:3000` and check each of these against `styled-v5.html`:
  - the hero and veil,
  - the scroll fade,
  - the toolbar,
  - the card hover effect,
  - the modal, with stages 1–7 on at least one `ar-en` page and one `en` page,
  - the box highlight on chunks and on extracted values,
  - the EN/AR toggle,
  - ← → wrapping, including in a single-page category,
  - a narrow width (375px), where the modal stacks,
  - `prefers-reduced-motion`.
- [ ] **Step 2:** Fix anything that's off. Run `npm test` and the Python unittest suite. Expected: all pass.
- [ ] **Step 3:** Commit any fixes: `fix: visual polish against mockup`.
