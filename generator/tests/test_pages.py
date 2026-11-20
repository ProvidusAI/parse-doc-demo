import tempfile
import unittest
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image

from generator.pages import compose_wall_tile, cut_page, make_thumb, page_jpeg, render_wall_thumb


def size(path):
    with Image.open(path) as im:
        return im.size


def make_pdf(path: Path, pages: int):
    doc = pdfium.PdfDocument.new()
    for _ in range(pages):
        doc.new_page(400, 600)
    doc.save(str(path))


class PagesTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())

    def test_cut_pdf_page(self):
        src = self.tmp / "three.pdf"
        make_pdf(src, 3)
        out = cut_page(src, 2, self.tmp / "out")
        self.assertEqual(out.suffix, ".pdf")
        self.assertEqual(len(pdfium.PdfDocument(str(out))), 1)

    def test_cut_pdf_pages_from_many_threads(self):
        # PDFium is not thread-safe; `generate --local --jobs 4` cuts pages from 4 threads (2026-11-20)
        from concurrent.futures import ThreadPoolExecutor
        srcs = []
        for i in range(16):
            srcs.append(self.tmp / f"d{i}.pdf"); make_pdf(srcs[-1], 30)
        with ThreadPoolExecutor(8) as ex:
            outs = list(ex.map(lambda s: cut_page(s, 7, self.tmp / "out" / s.stem), srcs * 4))
        self.assertTrue(all(len(pdfium.PdfDocument(str(o))) == 1 for o in outs))

    def test_cut_page_out_of_range(self):
        src = self.tmp / "one.pdf"
        make_pdf(src, 1)
        with self.assertRaises(ValueError):
            cut_page(src, 5, self.tmp / "out")

    def test_cut_webp_to_png(self):
        src = self.tmp / "a.webp"
        Image.new("RGB", (40, 60), "red").save(src, "WEBP")
        out = cut_page(src, 1, self.tmp / "out")
        self.assertEqual(out.suffix, ".png")
        self.assertEqual(size(out), (40, 60))

    def test_cut_jpg_copied(self):
        src = self.tmp / "a.jpg"
        Image.new("RGB", (40, 60), "red").save(src, "JPEG")
        out = cut_page(src, 1, self.tmp / "out")
        self.assertEqual(out.read_bytes(), src.read_bytes())

    def test_cut_page_redacts_boxes(self):
        src = self.tmp / "pass.jpg"
        Image.new("RGB", (100, 50), "white").save(src, "JPEG")
        out = cut_page(src, 1, self.tmp / "out", redact=[[10, 10, 40, 20]])
        self.assertEqual(out.suffix, ".png")
        with Image.open(out) as im:
            self.assertEqual(im.getpixel((20, 15)), (0, 0, 0))
            self.assertEqual(im.getpixel((60, 30)), (255, 255, 255))
        self.assertNotEqual(out.read_bytes(), src.read_bytes())

    def test_cut_docx_raises(self):
        src = self.tmp / "form.docx"
        src.write_bytes(b"PK")
        with self.assertRaisesRegex(ValueError, "docx not supported"):
            cut_page(src, 1, self.tmp / "out")

    def test_make_thumb_width(self):
        src = self.tmp / "big.png"
        Image.new("RGB", (1200, 1600), "white").save(src)
        dst = self.tmp / "t.jpg"
        make_thumb(src.read_bytes(), dst, 480)
        self.assertEqual(size(dst), (480, 640))

    def test_page_jpeg_caps_longest_side(self):
        import io
        buf = io.BytesIO()
        Image.new("RGB", (3000, 6000), "white").save(buf, "PNG")
        out = page_jpeg(buf.getvalue(), 2400)
        with Image.open(io.BytesIO(out)) as im:
            self.assertEqual((im.format, im.size), ("JPEG", (1200, 2400)))

    def test_page_jpeg_keeps_small_pages(self):
        import io
        buf = io.BytesIO()
        Image.new("RGB", (600, 800), "white").save(buf, "PNG")
        with Image.open(io.BytesIO(page_jpeg(buf.getvalue(), 2400))) as im:
            self.assertEqual(im.size, (600, 800))

    def test_render_wall_thumb_pdf(self):
        src = self.tmp / "doc.pdf"
        make_pdf(src, 2)
        dst = self.tmp / "w.jpg"
        render_wall_thumb(src, dst)
        self.assertEqual(size(dst)[0], 160)


    def test_compose_wall_tile(self):
        # 7 thumbnails fill 2 rows of 6 cards (the last row cycles back to the start), drawn at 2x:
        # 144x192 cards with 12px gaps, so the site can repeat it at 468x612 CSS px
        thumbs = []
        for i in range(7):
            thumbs.append(self.tmp / f"w{i:03d}.jpg")
            Image.new("RGB", (160, 226), (200, 30, 30)).save(thumbs[-1])
        dst = self.tmp / "wall.jpg"
        compose_wall_tile(thumbs, dst)
        with Image.open(dst) as im:
            self.assertEqual(im.size, (936, 408))
            self.assertTrue(min(im.getpixel((150, 100))) > 240)  # gap stays white (JPEG may shift it by a shade)
            r, g, b = im.getpixel((70, 100))  # inside a card: the thumbnail
            self.assertTrue(r > 150 and g < 90 and b < 90)
            r, g, b = im.getpixel((5 * 156 + 70, 204 + 100))  # last card of row 2 is filled too
            self.assertTrue(r > 150 and g < 90)

if __name__ == "__main__":
    unittest.main()
