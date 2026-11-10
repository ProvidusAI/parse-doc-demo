import io
import json
import unittest
from pathlib import Path

from PIL import Image

from generator.normalize import build_result, table_text

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
                                       "ocrModel": "docai-arabic-ocr-e4c", "elapsedSeconds": 45.6})
        self.assertEqual(r["segments"][0], {"id": "p1_e0000", "type": "header", "label": "header",
                                            "text": "TAX INVOICE فاتورة ضريبية", "textless": False,
                                            "box": {"page": 1, "x0": 300, "y0": 20, "x1": 700, "y1": 60}})
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


if __name__ == "__main__":
    unittest.main()
