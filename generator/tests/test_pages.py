import tempfile
import unittest
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image

from generator.pages import cut_page, make_thumb, page_jpeg, render_wall_thumb


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


if __name__ == "__main__":
    unittest.main()
