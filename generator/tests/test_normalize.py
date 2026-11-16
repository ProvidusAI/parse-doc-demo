import io
import json
import unittest
from pathlib import Path

from PIL import Image

from generator.normalize import _segment, build_result, mirror_rtl_cells, table_grid, table_text

FIX = Path(__file__).parent / "fixtures"
ENTRY = {
    "category": "financial", "categoryLabel": "Financial",
    "subCategory": "invoices", "subCategoryLabel": "Invoices",
    "sourcePath": "financial/invoices/KSA invoice.png", "page": 1, "lang": "ar-en",
    "status": "candidate", "note": "",
}
FILE_META = {"fileName": "invoices-abc123-KSA invoice.png", "mimeType": "image/png", "bytes": 52011}


def load(name):
    return json.loads((FIX / name).read_text(encoding="utf-8"))


def png(w=600, h=800):
    buf = io.BytesIO()
    Image.new("RGB", (w, h), "white").save(buf, "PNG")
    return buf.getvalue()


def build(**over):
    kw = dict(file_meta=FILE_META, job=load("job.json"), segments=load("segments.json"), page_image=png(),
              rules=load("rules.json"), split=load("split.json"), schema=load("schema.json"),
              extraction=load("extract.json"))
    kw.update(over)
    kw.setdefault("ocr_engine", "glm")
    return build_result(ENTRY, **kw)


def value(result, path):
    return next(v for v in result["extraction"]["values"] if v["path"] == path)


class NormalizeTest(unittest.TestCase):
    def test_normalize_full(self):
        r = build()
        self.assertEqual(r["id"], "financial/invoices")
        self.assertEqual(r["source"], {"fileName": "KSA invoice.png", "path": "financial/invoices/KSA invoice.png", "page": 1})
        self.assertEqual(r["page"], {"image": "/showcase/financial/invoices/page.jpg",
                                     "thumb": "/showcase/financial/invoices/thumb.jpg", "width": 600, "height": 800})
        self.assertEqual(r["upload"], {"fileName": "invoices-abc123-KSA invoice.png", "mimeType": "image/png",
                                       "bytes": 52011, "pageCount": 1, "backend": "glm-ocr",
                                       "ocrModel": "docai-arabic-ocr-e4c", "ocrEngine": "glm",
                                       "elapsedSeconds": 45.6})
        self.assertEqual(r["segments"][0], {"id": "p1_e0000", "type": "header", "label": "header",
                                            "text": "TAX INVOICE فاتورة ضريبية", "textless": False,
                                            "box": {"page": 1, "x0": 300, "y0": 20, "x1": 700, "y1": 60}, "table": None,
                                            "cells": None, "cellGrid": None})
        self.assertTrue(r["segments"][3]["textless"])
        self.assertEqual(r["splitRules"], [{"id": "rule-1", "name": "Invoice boundary",
                                            "description": "Start a new record at each TAX INVOICE header."}])
        self.assertEqual(r["split"]["qualityStatus"], "pass")
        self.assertEqual(r["split"]["coverage"], 1)
        self.assertEqual(r["split"]["records"][0]["confidence"], "high")
        self.assertEqual(r["schema"]["fields"][0], {"name": "total_amount", "type": "currency", "required": True,
                                                    "description": "Invoice total incl. VAT."})
        self.assertEqual(value(r, "total_amount"), {"path": "total_amount", "value": "1150.00", "confidence": 0.97,
                                                    "segmentId": "p1_e0002",
                                                    "box": {"page": 1, "x0": 40, "y0": 200, "x1": 960, "y1": 600}})
        self.assertEqual(r["extraction"]["json"]["items"][1]["description"], "Product 2")
        self.assertEqual(r["models"], {"split": "lmstudio/qwen/qwen3-vl-8b", "extract": "lmstudio/qwen/qwen3-vl-8b"})

    def test_box_clamped(self):
        self.assertEqual(build()["segments"][1]["box"]["x1"], 1000)

    def test_missing_coordinates_gives_null_box(self):
        self.assertIsNone(build()["segments"][4]["box"])

    def test_missing_usage_and_failed_ops(self):
        r = build(job={"job_id": "j", "status": "completed", "result": {}}, rules=None, split=None,
                  schema=None, extraction=None)
        self.assertIsNone(r["upload"]["pageCount"])  # not invented when DocAI omits it
        self.assertIsNone(r["upload"]["backend"])
        self.assertIsNone(r["upload"]["elapsedSeconds"])
        for key in ("splitRules", "split", "schema", "extraction"):
            self.assertIsNone(r[key], key)
        self.assertEqual(r["models"], {"split": None, "extract": None})

    def test_citation_path_maps_field_id(self):
        v = value(build(), "items[0].description")
        self.assertEqual((v["confidence"], v["segmentId"]), (0.88, "p1_e0002"))
        self.assertIsNone(value(build(), "items[1].description")["confidence"])

    def test_citation_without_segment(self):
        v = value(build(), "supplier_name")
        self.assertEqual(v["confidence"], 0.9)
        self.assertIsNone(v["box"])

    def test_citation_segment_id_with_evidence_label(self):
        ex = load("extract.json")
        ex["citations"][0]["segmentId"] = "p1_e0002|p.1|table"  # seen from qwen3-vl-8b on a real run
        v = value(build(extraction=ex), "total_amount")
        self.assertEqual(v["segmentId"], "p1_e0002")
        self.assertEqual(v["box"], {"page": 1, "x0": 40, "y0": 200, "x1": 960, "y1": 600})

    def test_table_text_strips_html(self):
        self.assertEqual(table_text("<table><tr><td>Item</td><td>Qty</td></tr><tr><td>A &amp; B</td></tr></table>"),
                         "Item · Qty · A & B")


def _c(text, header=False, rs=1, cs=1):
    return {"text": text, "header": header, "rowSpan": rs, "colSpan": cs}


class TableGridTests(unittest.TestCase):
    def test_table_grid_keeps_rows_headers_and_spans(self):
        got = table_grid('<table><tr><th>Item</th><th colspan="2">Qty</th></tr>'
                         '<tr><td rowspan="2">A &amp; B</td><td>1<br>2</td><td><b>x</b></td></tr></table>')
        self.assertEqual(got, {"rows": [[_c("Item", True), _c("Qty", True, 1, 2)],
                                        [_c("A & B", False, 2, 1), _c("1 2"), _c("x")]]})

    def test_table_grid_tolerates_bad_markup(self):
        self.assertEqual(table_grid("<table><tr><td>a<td>b"), {"rows": [[_c("a"), _c("b")]]})
        self.assertIsNone(table_grid("no table here"))
        self.assertIsNone(table_grid("<table></table>"))
        self.assertEqual(table_grid('<table><tr><td colspan="x">a</td></tr></table>')["rows"][0][0]["colSpan"], 1)

    def test_table_html_cut_off_at_the_start_is_repaired(self):
        # DocAI sometimes drops the opening <table><tr><td> and starts mid-cell
        md = "A</td></tr><tr><td>B</td><td>C</td></tr></table>"
        self.assertEqual(table_grid(md), {"rows": [[_c("A")], [_c("B"), _c("C")]]})
        seg = _segment({"id": "s", "type": "table", "markdown": md, "coordinates": None})
        self.assertEqual(seg["text"], "A · B · C")
        # rows without the <table> wrapper
        self.assertEqual(table_grid("<tr><td>x</td></tr>"), {"rows": [[_c("x")]]})
        # prose that merely mentions a tag is not a table
        self.assertIsNone(table_grid("see the td column"))

    def test_segment_keeps_docai_cells_with_page_boxes(self):
        cell = {"row": 0, "col": 1, "rowSpan": 1, "colSpan": 2, "text": "Qty", "isHeader": True,
                "bbox": {"x1": 0.1, "y1": 0.2, "x2": 0.35, "y2": 0.25}, "pixel_bbox": [1, 2, 3, 4]}
        s = {"id": "s", "type": "table", "markdown": "<table><tr><td>Qty</td></tr></table>",
             "coordinates": {"pageNumber": 1, "xmin": 0, "ymin": 0, "xmax": 1000, "ymax": 1000},
             "cells": [cell], "cellGrid": {"rows": "detected", "cols": "estimated"}}
        seg = _segment(s)
        self.assertEqual(seg["cells"], [{"row": 0, "col": 1, "rowSpan": 1, "colSpan": 2, "text": "Qty", "header": True,
                                         "box": {"page": 1, "x0": 100, "y0": 200, "x1": 350, "y1": 250}}])
        self.assertEqual(seg["cellGrid"], {"rows": "detected", "cols": "estimated"})

    def test_cell_confidence_follows_docai_when_grid_is_missing(self):
        base = {"id": "s", "type": "table", "markdown": "<table><tr><td>a</td></tr></table>", "coordinates": None,
                "cells": [{"row": 0, "col": 0, "text": "a", "bbox": {"x1": 0, "y1": 0, "x2": 1, "y2": 1}}]}
        self.assertEqual(_segment({**base, "cellsSource": "grid-estimate"})["cellGrid"], {"rows": "estimated", "cols": "estimated"})
        self.assertEqual(_segment({**base, "cellsSource": "table-former"})["cellGrid"], {"rows": "detected", "cols": "detected"})
        self.assertEqual(_segment(base)["cellGrid"], {"rows": "estimated", "cols": "estimated"})
        no_cells = _segment({"id": "t", "type": "text", "markdown": "hi", "coordinates": None})
        self.assertEqual((no_cells["cells"], no_cells["cellGrid"]), (None, None))

    def test_segment_carries_table_only_for_tables(self):
        md = "<table><tr><td>a</td></tr></table>"
        seg = _segment({"id": "s", "type": "table", "markdown": md, "coordinates": None})
        self.assertEqual(seg["table"]["rows"][0][0]["text"], "a")
        self.assertEqual(seg["text"], table_text(md))
        self.assertIsNone(_segment({"id": "t", "type": "text", "markdown": "hi", "coordinates": None})["table"])

    def test_table_grid_reads_markdown_pipe_tables(self):
        got = table_grid("| FROM: |  | TO: |\n| --- | --- | --- |\n| JFK |  | IST |")
        self.assertEqual(got, {"rows": [[_c("FROM:", True), _c("", True), _c("TO:", True)],
                                        [_c("JFK"), _c(""), _c("IST")]]})

    def test_pipe_lines_without_separator_are_not_a_table(self):
        self.assertIsNone(table_grid("| a | b |\n| c | d |"))
        self.assertIsNone(table_grid("a | b"))

    def test_segment_carries_markdown_table(self):
        md = "| A | B |\n|:--|--:|\n| 1 | x \\| y |"
        seg = _segment({"id": "s", "type": "table", "markdown": md, "coordinates": None})
        self.assertEqual(seg["table"]["rows"][1][1]["text"], "x | y")
        self.assertEqual(seg["text"], md)


if __name__ == "__main__":
    unittest.main()


MEASURED = {"rows": "detected", "cols": "detected"}


def _row(r, widths, texts):
    """One span-free row of site cells, boxes side by side left to right."""
    out, x = [], 0
    for c, (w, t) in enumerate(zip(widths, texts)):
        out.append({"row": r, "col": c, "rowSpan": 1, "colSpan": 1, "text": t, "header": False,
                    "box": {"page": 1, "x0": x, "y0": r * 10, "x1": x + w, "y1": r * 10 + 10}})
        x += w
    return out


def _texts(cells):
    return [[c["text"] for c in cells if c["row"] == r] for r in sorted({c["row"] for c in cells})]


class MirrorRtlCellsTests(unittest.TestCase):
    # DocAI pairs TableFormer's left-to-right columns with OCR text in reading order; for Arabic that
    # order is sometimes right-to-left, so the label lands in the numbers' box (utility statement page)
    def test_mirrored_table_is_put_back(self):
        cells = (_row(0, [34, 41, 35, 68], ["الفاتورة", "", "", ""])
                 + _row(1, [61, 42, 58, 129], ["قيمة استهلاك المياه", "2078.30", "103.92", "2,182.22"])
                 + _row(2, [36, 32, 33, 179], ["قيمة الصرف الصحي", "0.00", "0.00", "0.00"])
                 + _row(3, [36, 33, 34, 124], ["رسوم خدمة العداد", "4.67", "0.23", "4.90"])
                 + _row(4, [36, 13, 33, 52], ["تسويات", "0.00", "-", "0.00"]))  # weak on its own, follows the table
        self.assertEqual(_texts(mirror_rtl_cells(cells, MEASURED)), [
            ["", "", "", "الفاتورة"],
            ["2,182.22", "103.92", "2078.30", "قيمة استهلاك المياه"],
            ["0.00", "0.00", "0.00", "قيمة الصرف الصحي"],
            ["4.90", "0.23", "4.67", "رسوم خدمة العداد"],
            ["0.00", "-", "0.00", "تسويات"],
        ])

    def test_only_clearly_mirrored_rows_flip_in_a_mostly_correct_table(self):
        cells = (_row(0, [81, 40], ["بداية الفترة 1439/04/27", "التاريخ"])
                 + _row(1, [43, 76], ["28.00", "القراءة"])
                 + _row(2, [24, 132], ["فترة الاستهلاك (يوم)", "28"]))
        self.assertEqual(_texts(mirror_rtl_cells(cells, MEASURED)), [
            ["بداية الفترة 1439/04/27", "التاريخ"], ["28.00", "القراءة"], ["28", "فترة الاستهلاك (يوم)"]])

    def test_latin_tables_and_fixed_tables_are_left_alone(self):
        latin = _row(0, [24, 132], ["Consumption period (days)", "28"])
        self.assertEqual(mirror_rtl_cells(latin, MEASURED), latin)
        once = mirror_rtl_cells(_row(0, [24, 132], ["فترة الاستهلاك (يوم)", "28"]), MEASURED)
        self.assertEqual(mirror_rtl_cells(once, MEASURED), once)  # running it again changes nothing

    def test_a_row_with_a_gap_reverses_among_its_own_cells(self):
        # a merged cell from the row above covers column 0, so this row starts at column 1
        cells = [{**c, "col": c["col"] + 1} for c in _row(1, [24, 132], ["فترة الاستهلاك (يوم)", "28"])]
        self.assertEqual(_texts(mirror_rtl_cells(cells, MEASURED)), [["28", "فترة الاستهلاك (يوم)"]])

    def test_only_tables_with_both_axes_measured(self):
        cells = _row(0, [24, 132], ["فترة الاستهلاك (يوم)", "28"])
        for grid in ({"rows": "estimated", "cols": "detected"}, {"rows": "detected", "cols": "estimated"}, None):
            self.assertEqual(mirror_rtl_cells(cells, grid), cells)

    def test_segment_puts_mirrored_cell_text_back(self):
        cell = lambda col, x1, x2, t: {"row": 0, "col": col, "text": t, "bbox": {"x1": x1, "y1": 0.1, "x2": x2, "y2": 0.2}}
        seg = _segment({"id": "t", "type": "table", "markdown": "", "coordinates": None, "cellsSource": "table-former",
                        "cells": [cell(0, 0.10, 0.13, "فترة الاستهلاك (يوم)"), cell(1, 0.13, 0.30, "28")]})
        self.assertEqual([c["text"] for c in seg["cells"]], ["28", "فترة الاستهلاك (يوم)"])

    def test_rows_with_spans_are_not_touched(self):
        cells = _row(0, [24, 132], ["فترة الاستهلاك (يوم)", "28"])
        cells[0]["colSpan"] = 2
        self.assertEqual(mirror_rtl_cells(cells, MEASURED), cells)
