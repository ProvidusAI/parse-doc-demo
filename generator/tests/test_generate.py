import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

from generator import docai_client, generate
from generator.docai_client import DocAI, DocAIError

FIX = Path(__file__).parent / "fixtures"


def load(name):
    return json.loads((FIX / name).read_text(encoding="utf-8"))


def png_bytes():
    buf = io.BytesIO()
    Image.new("RGB", (300, 400), "white").save(buf, "PNG")
    return buf.getvalue()


def entry(sub="invoices", lang="ar-en", status="candidate"):
    return {"category": "financial", "categoryLabel": "Financial", "subCategory": sub,
            "subCategoryLabel": sub.title(), "sourcePath": f"financial/{sub}/a.png", "page": 1,
            "lang": lang, "status": status, "note": ""}


class FakeClient:
    def __init__(self, fail=None):
        self.fail, self.calls = fail or set(), []

    def _call(self, name, value):
        self.calls.append(name)
        if name in self.fail:
            raise DocAIError(f"{name} failed")
        return value

    def upload(self, path, name):
        return self._call("upload", "file-1")

    def parse(self, file_id, options):
        self.parse_options = options
        return self._call("parse", "job-1")

    def wait_job(self, file_id, job_id):
        return self._call("wait_job", load("job.json"))

    def segments(self, file_id):
        return self._call("segments", load("segments.json"))

    def page_image(self, file_id):
        return self._call("page_image", png_bytes())

    def run_op(self, path, body):
        out = {"/v1/split/rules/suggest": load("rules.json"), "/v1/split/runs": load("split.json"),
               "/v1/extract/schemas/generate": load("schema.json"), "/v1/extract/runs": load("extract.json")}[path]
        return self._call(path, out)


class GenerateTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.corpus, self.showcase, self.work = self.root / "corpus", self.root / "showcase", self.root / "work"
        for sub in ("invoices", "receipts", "bills"):
            (self.corpus / "financial" / sub).mkdir(parents=True)
            Image.new("RGB", (60, 80), "white").save(self.corpus / "financial" / sub / "a.png")

    def run_entry(self, e, client, force=False):
        return generate.run_entry(e, client, self.corpus, self.showcase, self.work, force=force)

    def test_run_entry_writes_outputs(self):
        client = FakeClient()
        self.run_entry(entry(), client)
        out = self.showcase / "financial" / "invoices"
        result = json.loads((out / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(result["upload"]["ocrModel"], "docai-arabic-ocr-e4c")
        self.assertTrue((out / "page.jpg").exists() and (out / "thumb.jpg").exists())
        self.assertFalse((out / "page.png").exists())
        self.assertEqual(result["page"]["image"], "/showcase/financial/invoices/page.jpg")
        self.assertEqual(client.parse_options,
                         {"backend": "glm-ocr", "ocr_model": "docai-arabic-ocr-e4c", "force": True})

    def test_skip_existing_and_no_partial_write(self):
        done = self.showcase / "financial" / "invoices"
        done.mkdir(parents=True)
        (done / "result.json").write_text("{}")
        client = FakeClient()
        self.assertIsNone(self.run_entry(entry(), client))
        self.assertEqual(client.calls, [])

        with self.assertRaises(DocAIError):
            self.run_entry(entry("receipts"), FakeClient(fail={"parse"}))
        out = self.showcase / "financial" / "receipts"
        self.assertFalse((out / "result.json").exists())
        self.assertFalse((out / "result.json.tmp").exists())

    def test_split_failure_keeps_entry(self):
        self.run_entry(entry(), FakeClient(fail={"/v1/split/runs"}))
        result = json.loads((self.showcase / "financial" / "invoices" / "result.json").read_text(encoding="utf-8"))
        self.assertIsNone(result["split"])
        self.assertIsNotNone(result["extraction"])

    def test_batch_filters_lang_and_rejected(self):
        entries = [entry("invoices"), entry("receipts", lang="en"), entry("bills", status="rejected")]
        with mock.patch.object(generate, "run_entry") as run:
            generate.run_batch(entries, "ar-en", FakeClient(), self.corpus, self.showcase, self.work)
        self.assertEqual([c.args[0]["subCategory"] for c in run.call_args_list], ["invoices"])

    def test_batch_continues_after_entry_failure(self):
        entries = [entry("invoices"), entry("receipts")]
        with mock.patch.object(generate, "run_entry", side_effect=[DocAIError("boom"), None]) as run:
            failed = generate.run_batch(entries, "ar-en", FakeClient(), self.corpus, self.showcase, self.work)
        self.assertEqual(run.call_count, 2)
        self.assertEqual(failed, ["financial/invoices"])

    def test_manifest_only_approved(self):
        for sub in ("invoices", "receipts"):
            self.run_entry(entry(sub), FakeClient())
        samples = [entry("invoices", status="approved"), entry("receipts", status="candidate")]
        (self.showcase / "wall").mkdir()
        (self.showcase / "wall" / "w000.jpg").write_bytes(b"x")
        m = generate.build_manifest(samples, self.showcase)
        self.assertEqual(m["wall"], ["/showcase/wall/w000.jpg"])
        self.assertEqual(m["categories"], [{"key": "financial", "label": "Financial", "pages": [
            {"id": "financial/invoices", "subCategoryLabel": "Invoices", "fileName": "a.png",
             "thumb": "/showcase/financial/invoices/thumb.jpg",
             "result": "/showcase/financial/invoices/result.json"}]}])


class ClientTest(unittest.TestCase):
    def test_run_op_polls_until_completed(self):
        c = DocAI("http://x", "k")
        replies = iter([(202, {"operation_id": "op1", "status": "queued"}),
                        (200, {"status": "in_progress", "output": None}),
                        (200, {"status": "completed", "output": {"rules": []}})])
        with mock.patch.object(c, "_req", side_effect=lambda *a, **k: next(replies)), \
                mock.patch.object(docai_client.time, "sleep"):
            self.assertEqual(c.run_op("/v1/split/rules/suggest", {"file_id": "f"}), {"rules": []})

    def test_run_op_replay_returns_inline(self):
        c = DocAI("http://x", "k")
        with mock.patch.object(c, "_req", return_value=(200, {"rules": [1]})):
            self.assertEqual(c.run_op("/v1/split/rules/suggest", {"file_id": "f"}), {"rules": [1]})

    def test_run_op_failed_raises(self):
        c = DocAI("http://x", "k")
        replies = iter([(202, {"operation_id": "op1"}), (200, {"status": "failed", "error": "model down"})])
        with mock.patch.object(c, "_req", side_effect=lambda *a, **k: next(replies)), \
                mock.patch.object(docai_client.time, "sleep"):
            with self.assertRaisesRegex(DocAIError, "model down"):
                c.run_op("/v1/extract/runs", {})

    def test_http_error_raises(self):
        c = DocAI("http://x", "k")
        with mock.patch.object(c, "_req", return_value=(402, {"error": "insufficient_credits"})):
            with self.assertRaisesRegex(DocAIError, "insufficient_credits"):
                c.parse("f", {})


if __name__ == "__main__":
    unittest.main()
