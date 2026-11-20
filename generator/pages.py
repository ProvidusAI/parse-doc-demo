"""Cut one page out of a corpus file for upload, and make thumbnails."""
import io
import random
import shutil
import threading
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw, ImageOps

CARD_WIDTH = 480
WALL_WIDTH = 160
WALL_COLS = 6  # cards per row in the tiled background
PAGE_MAX_SIDE = 2400  # boxes are 0–1000 normalised, so downscaling is safe
PDFIUM = threading.Lock()  # PDFium is not thread-safe; `generate --local --jobs N` cuts pages from N threads


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
        with PDFIUM:
            doc = pdfium.PdfDocument(str(src))
            if not 1 <= page <= len(doc):
                raise ValueError(f"{src.name} has {len(doc)} pages, asked for {page}")
            out = pdfium.PdfDocument.new()
            out.import_pages(doc, [page - 1])
            dst = dst_dir / f"{src.stem}-p{page}.pdf"
            out.save(str(dst))
            out.close(); doc.close()
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


def compose_wall_tile(thumbs: list[Path], dst: Path) -> None:
    """The site's background as one image: the wall thumbnails as 3:4 cards (white gaps, light border, top of the
    page showing), 6 per row, drawn at 2x. The site repeats it at half size (468x612 CSS px)."""
    cw, ch, gap, line = 144, 192, 12, 2
    order = list(thumbs)
    random.Random(0).shuffle(order)  # scatter neighbours from the same category, the same way every run
    cells = -(-len(order) // WALL_COLS) * WALL_COLS
    tile = Image.new("RGB", (WALL_COLS * (cw + gap), cells // WALL_COLS * (ch + gap)), "white")
    draw = ImageDraw.Draw(tile)
    for i in range(cells):
        x, y = i % WALL_COLS * (cw + gap), i // WALL_COLS * (ch + gap)
        with Image.open(order[i % len(order)]) as im:
            card = ImageOps.fit(im.convert("RGB"), (cw - 2 * line, ch - 2 * line), Image.LANCZOS, centering=(0.5, 0))
        tile.paste(card, (x + line, y + line))
        draw.rectangle([x, y, x + cw - 1, y + ch - 1], outline="#e7e7e7", width=line)
    dst.parent.mkdir(parents=True, exist_ok=True)
    tile.save(dst, "JPEG", quality=80, progressive=True, optimize=True)
