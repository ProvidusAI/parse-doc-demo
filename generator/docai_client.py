"""Tiny stdlib client for the DocAI Bun API (docs/product-api.md in the DocAI repo)."""
import json
import mimetypes
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path


class DocAIError(RuntimeError):
    pass


def poll(fn, done, timeout, label):
    """Call fn until done(value); 2s start, x1.5 backoff, 10s ceiling."""
    start, delay = time.monotonic(), 2.0
    while True:
        value = fn()
        if done(value):
            return value
        if time.monotonic() - start > timeout:
            raise DocAIError(f"{label}: timed out after {timeout}s")
        time.sleep(delay)
        delay = min(delay * 1.5, 10.0)


class DocAI:
    def __init__(self, base_url: str, api_key: str):
        self.base, self.key = base_url.rstrip("/"), api_key

    def _req(self, method, path, body=None, raw=None, content_type=None):
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        url = path if path.startswith("http") else self.base + path
        req = urllib.request.Request(url, data=data, method=method, headers={"x-api-key": self.key})
        if data is not None:
            req.add_header("content-type", content_type or "application/json")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = resp.read()
                ctype = resp.headers.get("content-type", "")
                return resp.status, json.loads(payload) if "json" in ctype else payload
        except urllib.error.HTTPError as e:
            text = e.read().decode(errors="replace")
            try:
                return e.code, json.loads(text)
            except ValueError:
                return e.code, {"error": text[:300]}

    def _ok(self, method, path, **kw):
        status, data = self._req(method, path, **kw)
        if not 200 <= status < 300:
            raise DocAIError(f"{method} {path} -> {status}: {data}")
        return status, data

    def ocr_engine(self) -> str:
        """The OCR engine family DocAI is running ("glm" / "paddle-vl"), as DocAI reports it."""
        return self._ok("GET", "/v1/ai/models?capability=ocr")[1]["resolved_ocr_engine"]

    def upload(self, path: Path, name: str) -> str:
        boundary = uuid.uuid4().hex
        ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        head = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"auto_parse\"\r\n\r\nfalse\r\n"
                f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{name}\"\r\n"
                f"Content-Type: {ctype}\r\n\r\n").encode()
        body = head + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
        _, data = self._ok("POST", "/v1/files", raw=body, content_type=f"multipart/form-data; boundary={boundary}")
        return data["file"]["id"]

    def parse(self, file_id: str, options: dict) -> str:
        _, data = self._ok("POST", f"/v1/files/{file_id}/parse", body={"options": options})
        return data.get("jobId") or data["job"]["job_id"]

    def wait_job(self, file_id: str, job_id: str, timeout: int = 900) -> dict:
        job = poll(lambda: self._ok("GET", f"/v1/files/{file_id}/jobs/{job_id}")[1]["job"],
                   lambda j: j["status"] in ("completed", "failed", "cancelled"), timeout, "parse")
        if job["status"] != "completed":
            raise DocAIError(f"parse {job['status']}: {job.get('error')}")
        return job

    def segments(self, file_id: str) -> list:
        return self._ok("GET", f"/v1/files/{file_id}/segments")[1]

    def page_image(self, file_id: str) -> bytes:
        pages = self._ok("GET", f"/v1/files/{file_id}/page-images")[1].get("pages") or []
        if not pages:
            raise DocAIError("no page images returned")
        return self._ok("GET", pages[0])[1]

    def run_op(self, path: str, body: dict, timeout: int = 900):
        status, data = self._ok("POST", path, body=body)
        if status == 200:  # idempotent replay: result inline
            return data
        op_id = data["operation_id"]
        op = poll(lambda: self._ok("GET", f"/v1/operations/{op_id}")[1],
                  lambda o: o["status"] in ("completed", "failed", "cancelled"), timeout, path)
        if op["status"] != "completed":
            raise DocAIError(f"{path} {op['status']}: {op.get('error')}")
        return op["output"]
