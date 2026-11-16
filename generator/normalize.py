"""Turn raw DocAI responses into the site's ShowcaseResult dict (see lib/types.ts)."""
import html
import io
import re
from html.parser import HTMLParser

from PIL import Image

OCR_MODELS = {"ar-en": "docai-arabic-ocr-e4c", "en": "translate-studio/paddleocr-vl-1.6"}


def table_text(markup: str) -> str:
    """DocAI returns tables as HTML; the site shows plain cell text."""
    cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", markup, flags=re.S | re.I)
    cells = [html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in cells]
    return " · ".join(c for c in cells if c)


class _GridParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.cell = [], None

    def _close(self):
        if self.cell is not None:
            self.cell["text"] = " ".join(self.cell["text"].split())
            self.rows[-1].append(self.cell)
            self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._close()
            self.rows.append([])
        elif tag in ("td", "th"):
            self._close()
            if not self.rows:
                self.rows.append([])
            a = dict(attrs)
            self.cell = {"text": "", "header": tag == "th", "rowSpan": _span(a.get("rowspan")),
                         "colSpan": _span(a.get("colspan"))}
        elif tag == "br" and self.cell is not None:
            self.cell["text"] += " "

    def handle_endtag(self, tag):
        if tag in ("td", "th", "tr", "table"):
            self._close()

    def handle_data(self, data):
        if self.cell is not None:
            self.cell["text"] += data


def _span(v) -> int:
    try:
        return max(1, int(v))
    except (TypeError, ValueError):
        return 1


_SEP_CELL = re.compile(r"^:?-+:?$")


def _pipe_cells(line: str):
    parts = re.split(r"(?<!\\)\|", line.strip())[1:]
    if parts and not parts[-1].strip():
        parts.pop()
    return [p.replace("\\|", "|").strip() for p in parts]


def _pipe_grid(markup: str):
    """GFM pipe table: first run of `|` lines whose 2nd line is a separator row; None otherwise."""
    lines = [l.strip() for l in markup.splitlines()]
    start = next((i for i, l in enumerate(lines) if l.startswith("|")), None)
    if start is None:
        return None
    block = []
    for l in lines[start:]:
        if not l.startswith("|"):
            break
        block.append(_pipe_cells(l))
    if len(block) < 2 or not block[1] or not all(_SEP_CELL.match(c) for c in block[1]):
        return None
    cell = lambda t, h: {"text": t, "header": h, "rowSpan": 1, "colSpan": 1}
    return {"rows": [[cell(t, i == 0) for t in r] for i, r in enumerate([block[0]] + block[2:])]}


_TABLE_TAG = re.compile(r"</?(table|tr|td|th)\b[^>]*>", re.I)


def _table_html(markup: str):
    """The markup as a full HTML table, or None if it has no table tags.
    DocAI sometimes cuts the start off (`A</td></tr><tr>…</table>`): put the missing opening tags back."""
    if not _TABLE_TAG.search(markup):
        return None
    if "<table" in markup.lower():
        return markup
    first = _TABLE_TAG.search(markup).group(0).lower()
    if first.startswith("</t") and first[2:4] in ("td", "th"):
        return "<table><tr><td>" + markup  # begins inside a cell
    if first.startswith("</tr"):
        return "<table><tr>" + markup
    return "<table>" + markup


def table_grid(markup: str):
    """Rows/cells of DocAI's table (HTML or GFM pipe) with header flags and spans; None when there is no table."""
    full = _table_html(markup)
    if full is None:
        return _pipe_grid(markup)
    p = _GridParser()
    p.feed(full)
    p.close()
    p._close()
    rows = [r for r in p.rows if r]
    return {"rows": rows} if rows else None


def _clamp(v) -> int:
    return max(0, min(1000, int(v)))


def _box(coords):
    if not coords or any(k not in coords for k in ("xmin", "ymin", "xmax", "ymax")):
        return None
    return {"page": int(coords.get("pageNumber", 1)), "x0": _clamp(coords["xmin"]), "y0": _clamp(coords["ymin"]),
            "x1": _clamp(coords["xmax"]), "y1": _clamp(coords["ymax"])}


def _cells(s):
    """DocAI's per-cell grounding (segments API `cells`, fractional 0–1 boxes) as site cells with 0–1000 page boxes."""
    if not s.get("cells"):
        return None
    page = int((s.get("coordinates") or {}).get("pageNumber", 1))
    out = []
    for c in s["cells"]:
        b = c.get("bbox") or {}
        if not all(k in b for k in ("x1", "y1", "x2", "y2")):
            continue
        out.append({"row": int(c["row"]), "col": int(c["col"]), "rowSpan": _span(c.get("rowSpan")),
                    "colSpan": _span(c.get("colSpan")), "text": c.get("text") or "", "header": bool(c.get("isHeader")),
                    "box": {"page": page, "x0": _clamp(b["x1"] * 1000), "y0": _clamp(b["y1"] * 1000),
                            "x1": _clamp(b["x2"] * 1000), "y1": _clamp(b["y2"] * 1000)}})
    return out or None


def _cell_grid(s):
    """How far to trust the cell boxes — DocAI's cellConfidence: cellGrid, else detected unless the source is an estimate."""
    if not s.get("cells"):
        return None
    if s.get("cellGrid"):
        return {"rows": s["cellGrid"]["rows"], "cols": s["cellGrid"]["cols"]}
    axis = "detected" if s.get("cellsSource") and s["cellsSource"] != "grid-estimate" else "estimated"
    return {"rows": axis, "cols": axis}


def _segment(s):
    text = s.get("markdown") or ""
    table = table_grid(text)
    full = _table_html(text)
    if full is not None:
        text = table_text(full)
    cells = _cells(s)
    return {"id": s["id"], "type": s.get("type") or "other", "label": s.get("title") or s.get("type") or "",
            "text": text, "textless": bool(s.get("textless")), "box": _box(s.get("coordinates")), "table": table,
            "cells": cells, "cellGrid": _cell_grid(s) if cells else None}


def _field_paths(fields, prefix=""):
    """field id -> dotted name path, e.g. field-root-items-description -> items.description."""
    out = {}
    for f in fields or []:
        path = f"{prefix}{f['name']}"
        out[f["id"]] = path
        out.update(_field_paths(f.get("children"), path + "."))
    return out


def _leaves(node, path=""):
    if isinstance(node, dict):
        for k, v in node.items():
            yield from _leaves(v, f"{path}.{k}" if path else k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from _leaves(v, f"{path}[{i}]")
    else:
        yield path, node


def _extraction(extraction, schema, boxes):
    if not extraction:
        return None
    names = _field_paths((schema or {}).get("schema", {}).get("fields") or extraction.get("schema", {}).get("fields"))
    cites = {}
    for c in extraction.get("citations") or []:
        name = names.get((c.get("path") or "").rstrip("/").split("/")[-1])
        if name and name not in cites:
            cites[name] = c
    values = []
    for path, val in _leaves(extraction.get("jsonResult") or {}):
        c = cites.pop(re.sub(r"\[\d+\]", "", path), None)  # one citation per field: first row only
        # the model sometimes echoes the evidence label: "p1_e0002|p.1|table"
        seg = (c.get("segmentId") or "").split("|")[0] or None if c else None
        values.append({"path": path, "value": "" if val is None else str(val),
                       "confidence": c.get("confidence") if c else None, "segmentId": seg, "box": boxes.get(seg)})
    return {"json": extraction.get("jsonResult"), "values": values}


def build_result(entry, *, file_meta, job, segments, page_image, rules, split, schema, extraction, ocr_engine):
    rid = f"{entry['category']}/{entry['subCategory']}"
    width, height = Image.open(io.BytesIO(page_image)).size
    result = (job or {}).get("result") or {}
    usage = result.get("usage") or {}
    segs = [_segment(s) for s in segments or []]
    boxes = {s["id"]: s["box"] for s in segs}
    return {
        "id": rid,
        "category": entry["category"], "categoryLabel": entry["categoryLabel"],
        "subCategory": entry["subCategory"], "subCategoryLabel": entry["subCategoryLabel"],
        "lang": entry["lang"],
        "source": {"fileName": entry["sourcePath"].split("/")[-1], "path": entry["sourcePath"], "page": entry["page"]},
        "page": {"image": f"/showcase/{rid}/page.jpg", "thumb": f"/showcase/{rid}/thumb.jpg",
                 "width": width, "height": height},
        "upload": {**file_meta, "pageCount": result.get("page_count"), "backend": usage.get("backend"),
                   "ocrModel": entry.get("ocrModel") or OCR_MODELS[entry["lang"]], "ocrEngine": ocr_engine,
                   "elapsedSeconds": usage.get("elapsed_seconds")},
        "segments": segs,
        "splitRules": [{"id": r["id"], "name": r["name"], "description": r.get("description") or ""}
                       for r in rules["rules"]] if rules and rules.get("rules") else None,
        "split": {
            "records": [{"id": r["id"], "title": r.get("title") or "", "documentType": r.get("documentType"),
                         "startPage": r["startPage"], "endPage": r["endPage"], "confidence": r.get("confidence"),
                         "boundaryReason": r.get("boundaryReason")} for r in split.get("records") or []],
            "qualityStatus": split["quality"]["status"], "coverage": split["quality"].get("coverage", 0),
        } if split else None,
        "schema": {"title": schema["schema"].get("title") or "",
                   "fields": [{"name": f["name"], "type": f.get("type") or "", "required": bool(f.get("required")),
                               "description": f.get("description") or ""} for f in schema["schema"]["fields"]]}
        if schema and schema.get("schema") else None,
        "extraction": _extraction(extraction, schema, boxes),
        "models": {"split": (split or {}).get("modelId"), "extract": (extraction or {}).get("modelId")},
    }
