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
    def __init__(self, fail=None, engine="glm"):
        self.fail, self.calls, self.engine = fail or set(), [], engine

    def _call(self, name, value):
        self.calls.append(name)
        if name in self.fail:
            raise DocAIError(f"{name} failed")
        return value

    def ocr_engine(self):
        return self._call("ocr_engine", self.engine)

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
        return generate.run_entry(e, client, self.corpus, self.showcase, self.work, force=force, ocr_engine="glm")

    def test_run_entry_writes_outputs(self):
        client = FakeClient()
        self.run_entry(entry(), client)
        out = self.showcase / "financial" / "invoices"
        result = json.loads((out / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(result["upload"]["ocrModel"], "docai-arabic-ocr-e4c")
        self.assertEqual(result["upload"]["ocrEngine"], "glm")
        self.assertTrue((out / "page.jpg").exists() and (out / "thumb.jpg").exists())
        self.assertFalse((out / "page.png").exists())
        self.assertEqual(result["page"]["image"], "/showcase/financial/invoices/page.jpg")
        self.assertEqual(client.parse_options,
                         {"backend": "glm-ocr", "ocr_model": "docai-arabic-ocr-e4c", "force": True})

    def test_skip_existing_and_no_partial_write(self):
        done = self.showcase / "financial" / "invoices"
        done.mkdir(parents=True)
        (done / "result.json").write_text(json.dumps({"source": {"path": "financial/invoices/a.png", "page": 1}}))
        client = FakeClient()
        self.assertIsNone(self.run_entry(entry(), client))
        self.assertEqual(client.calls, [])

        with self.assertRaises(DocAIError):
            self.run_entry(entry("receipts"), FakeClient(fail={"parse"}))
        out = self.showcase / "financial" / "receipts"
        self.assertFalse((out / "result.json").exists())
        self.assertFalse((out / "result.json.tmp").exists())

    def test_swapped_entry_is_rerun_not_skipped(self):
        self.run_entry(entry(), FakeClient())
        swapped = {**entry(), "sourcePath": "financial/receipts/a.png"}  # new candidate, same sub-category
        client = FakeClient()
        self.assertIsNotNone(self.run_entry(swapped, client))
        self.assertIn("upload", client.calls)
        result = json.loads((self.showcase / "financial" / "invoices" / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(result["source"]["path"], "financial/receipts/a.png")

    def test_manifest_skips_output_from_another_source(self):
        self.run_entry(entry(), FakeClient())
        swapped = {**entry(status="approved"), "sourcePath": "financial/receipts/a.png"}
        self.assertEqual(generate.build_manifest([swapped], self.showcase)["categories"], [])

    def test_write_wall_removes_stale_thumbnails(self):
        wall = self.showcase / "wall"
        wall.mkdir(parents=True)
        for i in range(3):
            (wall / f"w{i:03d}.jpg").write_bytes(b"old")
        generate.write_wall(["financial/invoices/a.png"], self.corpus, self.showcase)
        self.assertEqual(sorted(p.name for p in wall.glob("*.jpg")), ["w000.jpg"])

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

    def test_batch_refuses_wrong_engine(self):
        with mock.patch.object(generate, "run_entry") as run:
            with self.assertRaisesRegex(SystemExit, "paddle-vl"):
                generate.run_batch([entry()], "ar-en", FakeClient(engine="paddle-vl"), self.corpus, self.showcase, self.work)
        run.assert_not_called()

    def test_batch_passes_engine_reported_by_docai(self):
        with mock.patch.object(generate, "run_entry") as run:
            generate.run_batch([entry(lang="en")], "en", FakeClient(engine="paddle-vl"), self.corpus, self.showcase, self.work)
        self.assertEqual(run.call_args.kwargs["ocr_engine"], "paddle-vl")

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


def parsed_entry(status="approved"):
    return {"category": "chemical", "categoryLabel": "Chemical", "subCategory": "01-eng",
            "subCategoryLabel": "Safety Data Sheet", "sourcePath": "Chemical/01-eng.webp", "page": 1, "lang": "en",
            "status": status, "parsed": "Chemical/01-eng", "ocrModel": "docai-arabic-ocr-e4c", "ocrEngine": "glm"}


class ImportParsedTest(unittest.TestCase):
    """Pages a teammate already parsed: segments.json + original image, no DocAI call."""

    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.parsed, self.images, self.showcase = self.root / "parsed", self.root / "images", self.root / "showcase"
        (self.parsed / "Chemical").mkdir(parents=True)
        (self.images / "Chemical").mkdir(parents=True)
        Image.new("RGB", (60, 80), "white").save(self.images / "Chemical" / "01-eng.webp")
        (self.parsed / "Chemical" / "01-eng.segments.json").write_text(json.dumps(load("segments.json")), encoding="utf-8")
        (self.parsed / "Chemical" / "01-eng.extraction.json").write_text(
            json.dumps({"document": {"page_count": 1}}), encoding="utf-8")

    def test_import_writes_result_without_docai(self):
        generate.import_entry(parsed_entry(), self.parsed, self.images, self.showcase)
        out = self.showcase / "chemical" / "01-eng"
        r = json.loads((out / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(len(r["segments"]), len(load("segments.json")))
        self.assertEqual((r["upload"]["ocrModel"], r["upload"]["ocrEngine"]), ("docai-arabic-ocr-e4c", "glm"))
        self.assertEqual(r["upload"]["pageCount"], 1)
        self.assertIsNone(r["upload"]["elapsedSeconds"])  # not recorded by the teammate's run: never invented
        self.assertEqual((r["split"], r["schema"], r["extraction"], r["splitRules"]), (None, None, None, None))
        self.assertEqual((r["page"]["width"], r["page"]["height"]), (60, 80))
        self.assertTrue((out / "page.jpg").exists() and (out / "thumb.jpg").exists())
        self.assertIsNone(generate.import_entry(parsed_entry(), self.parsed, self.images, self.showcase))  # done

    def test_docai_batch_never_uploads_imported_pages(self):
        with mock.patch.object(generate, "run_entry") as run:
            generate.run_batch([parsed_entry()], "en", FakeClient(engine="paddle-vl"), None, None, None)
        run.assert_not_called()

    def test_imported_pages_reach_the_manifest(self):
        generate.import_entry(parsed_entry(), self.parsed, self.images, self.showcase)
        cats = generate.build_manifest([parsed_entry()], self.showcase)["categories"]
        self.assertEqual(cats[0]["pages"][0]["fileName"], "01-eng.webp")


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


class RefreshSegmentsTest(unittest.TestCase):
    setUp = GenerateTest.setUp
    run_entry = GenerateTest.run_entry

    def result_path(self, e):
        return self.showcase / generate.entry_id(e) / "result.json"

    def test_refresh_replaces_segments_and_keeps_the_rest(self):
        e = entry()
        self.run_entry(e, FakeClient())
        f = self.result_path(e)
        r = json.loads(f.read_text(encoding="utf-8"))
        r["segments"], r["extraction"] = [], "sentinel"
        f.write_text(json.dumps(r), encoding="utf-8")
        client = FakeClient()
        self.assertTrue(generate.refresh_entry(e, client, self.showcase, {r["upload"]["fileName"]: "fid"}))
        after = json.loads(f.read_text(encoding="utf-8"))
        self.assertEqual(len(after["segments"]), len(load("segments.json")))
        self.assertEqual(after["extraction"], "sentinel")
        self.assertEqual(client.calls, ["segments"])

    def test_refresh_skips_unknown_file_and_imported(self):
        e = entry()
        self.run_entry(e, FakeClient())
        f = self.result_path(e)
        before = f.read_bytes()
        self.assertFalse(generate.refresh_entry(e, FakeClient(), self.showcase, {"other.png": "fid"}))
        self.assertEqual(f.read_bytes(), before)
        name = json.loads(before)["upload"]["fileName"]
        self.assertFalse(generate.refresh_entry({**e, "parsed": "x"}, FakeClient(), self.showcase, {name: "fid"}))
        self.assertFalse(generate.refresh_entry(entry("bills"), FakeClient(), self.showcase, {name: "fid"}))


if __name__ == "__main__":
    unittest.main()
