"""Run showcase samples through local DocAI and write static outputs for the site.

    python -m generator.generate --lang ar-en      # run a batch (skips finished entries)
    python -m generator.generate --lang en --only financial/invoices --force
    python -m generator.generate --wall            # render wall.json thumbnails
    python -m generator.generate --review          # write generator/out/review.html
    python -m generator.generate --manifest        # write public/showcase/manifest.json (approved only)
    python -m generator.generate --import-parsed   # pages already parsed elsewhere ("parsed" entries)
    python -m generator.generate --refresh-segments  # re-fetch segments of DocAI-run pages (no re-parse)
"""
import argparse
import html
import json
import mimetypes
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from generator.docai_client import DocAI, DocAIError
from generator.normalize import OCR_MODELS, _segment, build_result
from generator.pages import CARD_WIDTH, cut_page, make_thumb, page_jpeg, render_wall_thumb

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "providus-arabic-english-dataset"
SHOWCASE = ROOT / "public" / "showcase"
WORK = ROOT / "generator" / "out"
# pages a teammate already parsed with DocAI: <industry>/<name>.segments.json + the original images
PARSED = Path(os.environ.get("PARSED_DIR", ROOT.parent / "Industry-documents-E4c-parsed"))
PARSED_IMAGES = Path(os.environ.get("PARSED_IMAGES_DIR", ROOT.parent.parent / "Indusry documents"))

# DocAI picks the engine family from DOCAI_OCR_ENGINE; a model from the other family degrades silently.
EXPECTED_ENGINE = {"ar-en": "glm", "en": "paddle-vl"}

ENGINE_HINT = {
    "ar-en": "DocAI's default GLM engine (no change needed) - docai-arabic-ocr-e4c",
    "en": "DOCAI_OCR_ENGINE=paddle-vl and DOCAI_OCR_MODEL=translate-studio/paddleocr-vl-1.6 "
          "(local-dev/.env.dev + models.ocr.model), then `bash local-dev/dev-up.sh -d`",
}


def entry_id(e) -> str:
    return f"{e['category']}/{e['subCategory']}"


def is_done(entry, showcase: Path) -> bool:
    """Output exists AND came from this entry's source page (a swapped page must not reuse it)."""
    f = showcase / entry_id(entry) / "result.json"
    if not f.exists():
        return False
    try:
        src = json.loads(f.read_text(encoding="utf-8")).get("source", {})
    except ValueError:
        return False
    return src.get("path") == entry["sourcePath"] and src.get("page") == entry["page"]


def _try(label, fn, *args):
    try:
        return fn(*args)
    except DocAIError as err:
        print(f"    {label} failed: {err}", file=sys.stderr)
        return None


def run_entry(entry, client, corpus: Path, showcase: Path, work: Path, force=False, ocr_engine=None):
    """Run one sample end to end. Returns the result path, or None when skipped."""
    rid = entry_id(entry)
    out = showcase / rid
    if is_done(entry, showcase) and not force:
        return None
    src = corpus / entry["sourcePath"]
    upload = cut_page(src, entry["page"], work / "upload" / rid, redact=entry.get("redact"))
    name = f"{entry['subCategory']}-{uuid.uuid4().hex[:6]}-{upload.name}"  # DocAI rejects duplicate filenames
    file_id = client.upload(upload, name)
    options = {"backend": "glm-ocr", "ocr_model": OCR_MODELS[entry["lang"]], "force": True}
    job = client.wait_job(file_id, client.parse(file_id, options))
    segments, page = client.segments(file_id), page_jpeg(client.page_image(file_id))

    rules = _try("split rules", client.run_op, "/v1/split/rules/suggest", {"file_id": file_id})
    split = (_try("split", client.run_op, "/v1/split/runs", {"file_id": file_id, "rules": rules["rules"]})
             if rules and rules.get("rules") else None)
    schema = _try("schema", client.run_op, "/v1/extract/schemas/generate", {"file_id": file_id})
    extraction = (_try("extract", client.run_op, "/v1/extract/runs", {"file_id": file_id, "schema": schema["schema"]})
                  if schema and schema.get("schema") else None)

    file_meta = {"fileName": name, "mimeType": mimetypes.guess_type(upload.name)[0] or "application/octet-stream",
                 "bytes": upload.stat().st_size}
    result = build_result(entry, file_meta=file_meta, job=job, segments=segments, page_image=page, rules=rules,
                          split=split, schema=schema, extraction=extraction,
                          ocr_engine=ocr_engine)
    return _write(out, page, result)


def import_entry(entry, parsed: Path, images: Path, showcase: Path, force=False):
    """A page already parsed elsewhere: its segments.json + original image, no DocAI call.
    Split/extract were not run there, so those stages show 'Not returned by DocAI'."""
    if is_done(entry, showcase) and not force:
        return None
    src = images / entry["sourcePath"]
    segments = json.loads((parsed / f"{entry['parsed']}.segments.json").read_text(encoding="utf-8"))
    doc = json.loads((parsed / f"{entry['parsed']}.extraction.json").read_text(encoding="utf-8"))["document"]
    page = page_jpeg(src.read_bytes())
    file_meta = {"fileName": src.name, "mimeType": mimetypes.guess_type(src.name)[0] or "application/octet-stream",
                 "bytes": src.stat().st_size}
    result = build_result(entry, file_meta=file_meta, job={"result": {"page_count": doc.get("page_count")}},
                          segments=segments, page_image=page, rules=None, split=None, schema=None, extraction=None,
                          ocr_engine=entry.get("ocrEngine"))
    return _write(showcase / entry_id(entry), page, result)


def refresh_entry(entry, client, showcase: Path, files: dict) -> bool:
    """Re-fetch one DocAI-run page's segments by its uploaded filename; rewrite only `segments`."""
    f = showcase / entry_id(entry) / "result.json"
    if entry.get("parsed") or not f.exists():
        return False
    result = json.loads(f.read_text(encoding="utf-8"))
    file_id = files.get(result["upload"]["fileName"])
    if not file_id:
        return False
    result["segments"] = [_segment(s) for s in client.segments(file_id)]
    tmp = f.with_name("result.json.tmp")
    tmp.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(f)
    return True


def _write(out: Path, page: bytes, result: dict) -> Path:
    out.mkdir(parents=True, exist_ok=True)
    (out / "page.jpg").write_bytes(page)
    make_thumb(page, out / "thumb.jpg", CARD_WIDTH)
    tmp = out / "result.json.tmp"
    tmp.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(out / "result.json")
    return out / "result.json"


def run_batch(entries, lang, client, corpus, showcase, work, only=None, force=False):
    """Run every non-rejected entry of `lang`. Returns ids that failed."""
    engine = client.ocr_engine()
    if engine != EXPECTED_ENGINE[lang]:
        raise SystemExit(f"DocAI is running the {engine} OCR engine; the {lang} batch needs "
                         f"{EXPECTED_ENGINE[lang]}. Set: {ENGINE_HINT[lang]}")
    failed = []
    for e in entries:
        if e["lang"] != lang or e["status"] == "rejected" or e.get("parsed") or (only and entry_id(e) != only):
            continue
        try:
            done = run_entry(e, client, corpus, showcase, work, force=force, ocr_engine=engine)
            print(f"  {entry_id(e)}: {'ok' if done else 'skipped'}")
        except (DocAIError, ValueError, OSError) as err:
            print(f"  {entry_id(e)}: FAILED {err}", file=sys.stderr)
            failed.append(entry_id(e))
    return failed


def build_manifest(samples, showcase: Path) -> dict:
    cats = {}
    for e in samples:
        rid = entry_id(e)
        if e["status"] != "approved" or not is_done(e, showcase):
            continue
        cat = cats.setdefault(e["category"], {"key": e["category"], "label": e["categoryLabel"], "pages": []})
        cat["pages"].append({"id": rid, "subCategoryLabel": e["subCategoryLabel"],
                             "fileName": e["sourcePath"].split("/")[-1],
                             "thumb": f"/showcase/{rid}/thumb.jpg", "result": f"/showcase/{rid}/result.json"})
    wall = sorted(f"/showcase/wall/{p.name}" for p in (showcase / "wall").glob("*.jpg"))
    return {"generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "wall": wall,
            "categories": list(cats.values())}


def write_wall(files, corpus: Path, showcase: Path):
    for old in (showcase / "wall").glob("w*.jpg"):  # a file dropped from wall.json must leave the site
        old.unlink()
    for i, rel in enumerate(files):
        render_wall_thumb(corpus / rel, showcase / "wall" / f"w{i:03d}.jpg")


def write_review(samples, showcase: Path, dst: Path):
    rows = []
    for e in samples:
        rid, f = entry_id(e), showcase / entry_id(e) / "result.json"
        if not f.exists():
            rows.append(f"<tr><td>{rid}<br><b>{e['status']}</b></td><td colspan=2>not generated</td></tr>")
            continue
        r = json.loads(f.read_text(encoding="utf-8"))
        segs = "".join(f"<li><code>{s['type']}</code> {html.escape(s['text'][:120])}</li>" for s in r["segments"][:25])
        vals = "".join(f"<li><code>{html.escape(v['path'])}</code> {html.escape(v['value'][:80])} "
                       f"({v['confidence']})</li>" for v in (r["extraction"] or {}).get("values", [])[:25])
        split = r["split"] and f"{len(r['split']['records'])} record(s), {r['split']['qualityStatus']}"
        rows.append(f"<tr><td>{rid}<br>{html.escape(e['sourcePath'])}<br>lang {e['lang']}<br><b>{e['status']}</b>"
                    f"<br>backend {r['upload']['backend']}<br>split: {split}</td>"
                    f"<td><img src='../../public{r['page']['image']}' width=360></td>"
                    f"<td><ol dir=auto>{segs}</ol><ul dir=auto>{vals or '<li>no extraction</li>'}</ul></td></tr>")
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text("<!doctype html><meta charset=utf-8><title>Showcase review</title>"
                   "<style>body{font:13px system-ui}td{vertical-align:top;border-top:1px solid #ddd;padding:8px}"
                   "</style><table>" + "".join(rows) + "</table>", encoding="utf-8")


def api_key() -> str:
    if os.environ.get("DOCAI_API_KEY"):
        return os.environ["DOCAI_API_KEY"]
    for line in (ROOT / ".env.x-api-key").read_text(encoding="utf-8").splitlines():
        if line.startswith("api-key="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise SystemExit("no API key: set DOCAI_API_KEY or api-key= in .env.x-api-key")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", choices=sorted(OCR_MODELS))
    ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--wall", action="store_true")
    ap.add_argument("--review", action="store_true")
    ap.add_argument("--manifest", action="store_true")
    ap.add_argument("--import-parsed", action="store_true")
    ap.add_argument("--refresh-segments", action="store_true")
    a = ap.parse_args(argv)
    samples = json.loads((ROOT / "samples.json").read_text(encoding="utf-8"))
    if a.wall:
        write_wall(json.loads((ROOT / "wall.json").read_text(encoding="utf-8")), CORPUS, SHOWCASE)
    if a.lang:
        print(f"OCR engine for this batch: {ENGINE_HINT[a.lang]}")
        client = DocAI(os.environ.get("DOCAI_BASE_URL", "http://localhost:8787"), api_key())
        failed = run_batch(samples, a.lang, client, CORPUS, SHOWCASE, WORK, only=a.only, force=a.force)
        if failed:
            print(f"failed: {', '.join(failed)}", file=sys.stderr)
    if a.import_parsed:
        for e in samples:
            if e.get("parsed") and e["status"] != "rejected" and (not a.only or entry_id(e) == a.only):
                done = import_entry(e, PARSED, PARSED_IMAGES, SHOWCASE, force=a.force)
                print(f"  {entry_id(e)}: {'ok' if done else 'skipped'}")
    if a.refresh_segments:
        client = DocAI(os.environ.get("DOCAI_BASE_URL", "http://localhost:8787"), api_key())
        files = {f["filename"]: f["id"] for f in client.list_files()}
        for e in samples:
            if e["status"] == "approved" and not e.get("parsed"):
                ok = refresh_entry(e, client, SHOWCASE, files)
                print(f"  {entry_id(e)}: {'refreshed' if ok else 'NOT FOUND in DocAI'}")
    if a.review:
        write_review(samples, SHOWCASE, WORK / "review.html")
        print(f"wrote {WORK / 'review.html'}")
    if a.manifest:
        (SHOWCASE / "manifest.json").write_text(json.dumps(build_manifest(samples, SHOWCASE), ensure_ascii=False,
                                                           indent=1), encoding="utf-8")
        print(f"wrote {SHOWCASE / 'manifest.json'}")


if __name__ == "__main__":
    main()
