// The only module that imports ExcelJS: loaded with import() on the first Excel click, so it never
// weighs on page load.
import ExcelJS from "exceljs";
import type { Sheet } from "./export";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const thin = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
const longestLine = (v: string | number) => Math.max(...String(v).split("\n").map((l) => l.length));

/** Sheets as a formatted .xlsx: bold shaded header, thin borders, merges, wrapped text, sized columns. */
export async function workbookBlob(sheets: Sheet[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name, {
      views: [{ rightToLeft: s.rtl, ...(s.freezeHeader && { state: "frozen" as const, ySplit: 1 }) }],
    });
    const widths: number[] = [];
    s.rows.forEach((row, r) =>
      row.forEach((cell, c) => {
        const x = ws.getCell(r + 1, c + 1);
        x.border = BORDER; // covered slots too, so merged blocks keep their outline
        x.alignment = { vertical: "top", wrapText: true };
        if (!cell) return;
        x.value = cell.value;
        if (cell.header) {
          x.font = { bold: true };
          x.fill = HEADER_FILL;
        }
        widths[c] = Math.max(widths[c] ?? 0, longestLine(cell.value));
      }),
    );
    for (const m of s.merges) ws.mergeCells(m.top + 1, m.left + 1, m.bottom + 1, m.right + 1);
    widths.forEach((w, c) => (ws.getColumn(c + 1).width = Math.min(60, Math.max(10, w + 2))));
  }
  return new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_TYPE });
}
