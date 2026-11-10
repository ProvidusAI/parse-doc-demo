# ProvidusBench showcase site: design

Date: 2026-11-10 · Status: draft for approval (open questions answered)

## Intent

A public-facing showcase for Providus DocAI, styled like parsebench.ai. Visitors land on a hero over a wall of document pages, scroll into a page grid grouped by category, click any page, and see **what DocAI actually produced for that page** across the 7 pipeline stages. The point is to prove our own models handle real Arabic and Arabic-English documents. It is not a benchmark leaderboard.

## Goals

- Recreate the look and feel of parsebench.ai: typography, palette, frosted veil over the page wall, scroll choreography, modal inspector.
- One real page per corpus sub-category. Every one is run through the real DocAI pipeline, and the outputs are saved and shown.
- A side panel with 7 stages, modelled on the providus.ai screenshots and filled with real data.
- Runs locally (`npm run dev`, `npm run build && npm start`).

## Non-goals (for now)

- Deployment or hosting.
- Showing every corpus file. It's one page per sub-category; more can come later by adding entries to the sample list.
- Leaderboard, model comparison, accounts, uploads by visitors, or a live DocAI call from the browser.

## Anti-goals (a failure even if it works)

- **No made-up numbers.** Every box, chunk, rule, field, value and confidence shown must come from a saved DocAI output. If DocAI does not return a value (e.g. a confidence), the UI omits it rather than inventing one. The providus.ai screenshots show figures like "99.8% match"; copy that layout, not those numbers.
- Copying ParseBench/LlamaIndex branding: logos, names, copy. We match their *style*, not their identity.
- A heavy, slow page. The page wall must stay smooth on a normal laptop.

## Constraints and decided choices

| Topic | Decision | Whose |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | user |
| Git | `main` → `development-branch` → `feature/frontend`; `main` and `development-branch` carry no code; all work on `feature/frontend` | user |
| Commits | Short, to-the-point messages; body as brief bullet points | user |
| Data source | Real DocAI output, one page per sub-category | user |
| Navigation | Category tabs above the grid; modal shows the page's sub-category; ← / → moves to the next sub-category page *within the current tab* | user |
| Look | Match parsebench.ai (mockup v2 accepted) | user |
| Site location | `C:\Users\mujta\OneDrive\Desktop\doc-ai\providus-bench.ai\` | user |
| Rendering | Static: all data precomputed into the repo; no server-side calls at runtime | my call |
| Corpus in git | Not committed (663 MB). Only generated page PNGs + JSON are committed | my call |
| OCR models | Arabic-English mixed pages: `docai-arabic-ocr-e4c`; English-only pages: `paddle-ocr-vl-1.6` | user |
| Privacy | Pick clean pages: each showcased page (and every wall thumbnail) must carry no personal data — real names, ID/VAT/account numbers, faces, signatures of private people | user |
| EN \| العربية toggle | Switches the site's own UI labels and flips layout to RTL. DocAI output is shown exactly as produced, never translated | user |
| Poor DocAI output | Swap to another file from the same sub-category and re-run; the user reviews the final set before it ships | user |
| Brand name / copy | Working name "ProvidusBench"; hero copy as in mockup v2. Easy to change | my call |

## Design tokens (measured from parsebench.ai)

- Fonts: **Overused Grotesk** (OFL; self-host, falling back to Inter Tight) for UI text; **IBM Plex Mono** for labels, numbers, buttons; **IBM Plex Sans Arabic** for Arabic text.
- Colors: bg `#fff`, fg `#000`, text-2 `#404040`, text-3 `#737373`, muted `#f5f5f5`, border `#e7e7e7`, accent/ring `#0077c7`, veil `rgba(250,250,252,.88)`.
- Radius `0` everywhere except the round modal arrows and close button.
- H1 72px / weight 500 / tracking −0.03em / line-height 1.02. Lead 18px, line-height 1.62, `#404040`.
- Buttons: 40px tall, mono, 12px, uppercase, letter-spacing .1em; primary black, secondary white with border.
- Nav: fixed, 64px, white 90% + `backdrop-filter: blur(24px)`, bottom border. Toolbar: white 85% + blur(12px).
- Motion: `fade-in` (opacity 0 + translateY 8px → 0), `bounce` on the scroll mouse, slow `aurora-drift` glow in the side panel, staggered list reveals (60–90ms), scan-line on the OCR stage. All disabled under `prefers-reduced-motion`.

## Page structure

### 1. Landing / hero
- Fixed nav: mark, "ProvidusBench" tab (active underline in accent), section links, `Docs` and `Try DocAI` buttons.
- Behind everything: a fixed **page wall**. It is a dense grid of thumbnails drawn from the whole corpus, not only the showcased pages, so it looks full. These are decorative and not clickable.
- Hero sits in a frosted veil (veil colour + blur 6px). Contents:
  - Headline, with an Arabic line under it.
  - A lead paragraph.
  - Stats: categories, document types, 7 stages, AR·EN.
  - CTAs.
  - The 7-stage list on the right.
  - "Scroll to explore" with a bouncing mouse icon.
- On scroll (0→~420px): the hero fades and lifts, the wall blurs, the category toolbar slides in and the dataset grid fades in. "Explore the pages" smooth-scrolls there.

### 2. Dataset
- Sticky toolbar with category tabs and counts (black when active), search box (filters by sub-category/file name), Grid / Fit page toggle.
- Section heading: category name + "N document types · 1 page each".
- Card grid of large thumbnails. On hover: border turns black, the card lifts, image zooms slightly. Caption shows sub-category name + mono meta.
- Bottom hint pill: "Click a page to see what DocAI produced · ← → to move between types".

### 3. Inspector modal
- Veil + blur over the site. Close (×) top-right, round ‹ › arrows at the sides. Esc closes. ← → move within the current category tab and wrap around.
- Left: page image (contain, shadow), with an SVG overlay for boxes. Below it in mono: file name, then "Category · Sub-category · i of n".
- Right panel:
  - Category and sub-category chips, plus the EN | العربية toggle.
  - A horizontal stepper with 7 steps: done steps are tinted, the current step is black, and any step can be clicked.
  - A body that changes with the step.
  - A footer reading "Step n of 7 · name".

### The 7 stages (what each shows, all from saved DocAI output)
1. **Upload**:
   - File name, type, size and page count of the uploaded page.
   - Parse backend and models used, from the job record.
2. **Parsing & OCR**: every detected region drawn on the page, a scan-line animation, and a list of regions with their type and text.
3. **Parsed chunks**: the segment list (type, text, page). Hovering or clicking a chunk highlights its box on the page.
4. **Split rules**: the rules DocAI suggested (name, kind, description), shown as read-only toggles.
5. **Split result**: the records from the split run (title, page range) plus the quality status.
6. **Extract rules**: the schema DocAI generated (field name, type, required, description).
7. **Extracted schema**:
   - Fields / JSON views of the extracted record.
   - Clicking a value highlights its citation box on the page.
   - Confidence is shown only if a citation carries one.

## Data pipeline (part of this job)

A generation script in the repo (e.g. `scripts/generate-showcase`) does the following:

1. Reads `samples.json`, a hand-editable list of entries: `{ category, subCategory, sourcePath, page, lang: "ar-en" | "en", status: "candidate" | "approved" | "rejected", note }`.
   - Only `approved` entries are shown on the site. `rejected` keeps a record of why a page was swapped, whether for poor output or personal data.
   - My call: the default is page 1, or the first page with real content for long reports.
   - It covers the 20 sub-category folders plus `other` (loose files), which gives **11 tabs and 21 pages**.
   - Because only one page is uploaded, split usually returns a single record (e.g. "1 record, P.1–1"). That is expected and shown as it is.
   - Category order and labels are set there too.
2. Cuts that single page out of the source and uploads it to the **local DocAI middleware**. PDFs are cut to a one-page PDF; images go as they are; the one DOCX in government/applications_and_forms is converted to PDF first, or another file is picked.
3. Runs the pipeline through the public Bun API and polls until each step completes (`docs/product-api.md` in the DocAI repo):
   - parse
   - `GET segments`, `GET page-images`
   - `POST /v1/split/rules/suggest`, then `POST /v1/split/runs`
   - `POST /v1/extract/schemas/generate`, then `POST /v1/extract/runs`
   - The OCR model per page follows `lang`: `docai-arabic-ocr-e4c` for `ar-en` and `paddle-ocr-vl-1.6` for `en`.
     - The model is sent as the `ocr_model` parse option.
     - DocAI picks the OCR *engine family* from `DOCAI_OCR_ENGINE` alone, and a model from the other family returns degraded output (`docs/integrations.md`). So the script runs the two languages as **separate batches**, and between them the operator switches the engine and model in DocAI's config and restarts the worker. The script prints exactly what to set.
     - Born-digital PDFs must still go through these OCR models, not Docling, so the parse backend is forced to the OCR lane.
     - The Upload stage shows the model ids that DocAI's job record reports, not ones assumed by the script.
   - Split and extract use DocAI's configured local LLM.
4. Writes `public/showcase/<category>/<sub>/page.png` (DocAI's own page image, so box coordinates line up) and `result.json` (normalised outputs for all 7 stages). It also writes one `public/showcase/manifest.json`.
5. Makes small thumbnails for the cards and for the decorative wall.
   - The wall uses ~150 thumbnails at ≤160px wide, so no text is readable.
   - Wall thumbnails are drawn only from files picked as clean: reports, regulations, papers, newspapers, notices, and approved showcase pages. They are listed in `wall.json` for review.
6. **Review step.** The script writes a contact sheet (`review.html`, local only) showing each page next to its key outputs. The user marks entries approved or rejected in `samples.json`. Rejected entries get a new candidate and are re-run.

The script is re-runnable and skips entries that already have output unless forced. It needs DocAI running locally (`local-dev/dev-up.sh`) and an API key passed in through an env var, never committed. The site itself never talks to DocAI.

## Left to the builder

- Next.js project layout, component split, and the CSS approach. Plain CSS modules, or Tailwind as DocAI's web app uses, is fine.
- How the page wall is rendered: CSS grid of `<img>` or canvas, whichever stays smooth.
- Exact normalised `result.json` shape.
- Script language (Node/TS or Python); `pypdfium2` and Node 24 are available locally.
- Search behaviour details and the Fit page view.
- Responsive behaviour. On narrow screens the modal stacks the page above the panel.

## Open questions

None. All answered on 2026-11-10 and recorded in the decisions table.
