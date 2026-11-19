"""Cut one page out of a corpus file for upload, and make thumbnails."""
import io
import shutil
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw

CARD_WIDTH = 480
WALL_WIDTH = 160
PAGE_MAX_SIDE = 2400  # boxes are 0–1000 normalised, so downscaling is safe


def cut_page(src: Path, page: int, dst_dir: Path, redact=None) -> Path:
    """Return a single-page file DocAI can parse. `page` is 1-based.

    `redact`: [[x0, y0, x1, y1], ...] in source-image pixels, blacked out before upload
    (images only) so personal data never reaches DocAI or the site.
    """
    dst_dir.mkdir(parents=True, exist_ok=True)
    ext = src.suffix.lower()
    if redact:
        if ext in (".pdf", ".docx"):
            raise ValueError(f"redaction is supported for images only: {src.name}")
        im = Image.open(src).convert("RGB")
        draw = ImageDraw.Draw(im)
        for box in redact:
            draw.rectangle(box, fill=(0, 0, 0))
        dst = dst_dir / f"{src.stem}-redacted.png"
        im.save(dst, "PNG")
        return dst
    if ext == ".docx":
        raise ValueError(f"docx not supported, pick another file: {src.name}")
    if ext == ".pdf":
        doc = pdfium.PdfDocument(str(src))
        if not 1 <= page <= len(doc):
            raise ValueError(f"{src.name} has {len(doc)} pages, asked for {page}")
        out = pdfium.PdfDocument.new()
        out.import_pages(doc, [page - 1])
        dst = dst_dir / f"{src.stem}-p{page}.pdf"
        out.save(str(dst))
        return dst
    if ext == ".webp":
        dst = dst_dir / f"{src.stem}.png"
        Image.open(src).convert("RGB").save(dst, "PNG")
        return dst
    dst = dst_dir / src.name
    shutil.copyfile(src, dst)
    return dst


def page_jpeg(png: bytes, max_side: int = PAGE_MAX_SIDE) -> bytes:
    """DocAI page renders can be 15 MB+ PNGs; the inspector needs a light JPEG."""
    im = Image.open(io.BytesIO(png)).convert("RGB")
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=85, optimize=True)
    return buf.getvalue()


def make_thumb(image: bytes | Path, dst: Path, width: int) -> None:
    im = Image.open(io.BytesIO(image) if isinstance(image, bytes) else image).convert("RGB")
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "JPEG", quality=72)


def render_wall_thumb(src: Path, dst: Path) -> None:
    if src.suffix.lower() == ".pdf":
        bitmap = pdfium.PdfDocument(str(src))[0].render(scale=0.6)
        buf = io.BytesIO()
        bitmap.to_pil().save(buf, "PNG")
        make_thumb(buf.getvalue(), dst, WALL_WIDTH)
    else:
        make_thumb(src, dst, WALL_WIDTH)
