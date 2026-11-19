import { cellValue, exportName, recordRows, recordSheets, sheetRows, tableSheet, toCsv } from "./export";
import type { ExtractedValue, GroundedCell, Segment, TableCell } from "./types";

const tc = (text: string, header = false, rowSpan = 1, colSpan = 1): TableCell => ({ text, header, rowSpan, colSpan });
const seg = (rows: TableCell[][] | null, cells: GroundedCell[] | null = null): Segment => ({
  id: "s", type: "table", label: "table", text: "", textless: false, box: null,
  table: rows ? { rows } : null, cells,
});
const values = (s: ReturnType<typeof tableSheet>) => s!.rows.map((r) => r.map((c) => (c ? c.value : null)));

describe("cellValue: plain numbers become numbers, everything else stays as read", () => {
  test.each([["10", 10], ["-3.5", -3.5], ["0", 0], ["0.75", 0.75]])("%s → number", (t, n) => expect(cellValue(t)).toBe(n));
  test.each(["1,285.20", "SAR 230.00", "2021-10-30", "١٠", "007", "", "10%", " 10", "1150.00", "2.50", "-0"])("%s stays text", (t) =>
    expect(cellValue(t)).toBe(t));
});

describe("tableSheet", () => {
  test("rows, header flags, number typing, name and frozen header", () => {
    const s = tableSheet(seg([[tc("Item", true), tc("Qty", true)], [tc("Product 1"), tc("10")]]), 3)!;
    expect(values(s)).toEqual([["Item", "Qty"], ["Product 1", 10]]);
    expect(s.rows[0].map((c) => c!.header)).toEqual([true, true]);
    expect(s.rows[1][0]!.header).toBe(false);
    expect(s).toMatchObject({ name: "Table 3", merges: [], rtl: false, freezeHeader: true });
  });

  test("a column span is merged and its covered slot left empty", () => {
    const s = tableSheet(seg([[tc("Total", true, 1, 2), tc("x", true)], [tc("a"), tc("b"), tc("c")]]), 1)!;
    expect(s.merges).toEqual([{ top: 0, left: 0, bottom: 0, right: 1 }]);
    expect(values(s)).toEqual([["Total", null, "x"], ["a", "b", "c"]]);
  });

  test("a row span pushes the next row's cells past it", () => {
    const s = tableSheet(seg([[tc("A", false, 2), tc("b")], [tc("c")]]), 1)!;
    expect(s.merges).toEqual([{ top: 0, left: 0, bottom: 1, right: 0 }]);
    expect(values(s)).toEqual([["A", "b"], [null, "c"]]);
  });

  test("ragged rows are padded to a rectangle, nothing lost", () => {
    const s = tableSheet(seg([[tc("a"), tc("b")], [tc("c")], [tc("d", false, 1, 3)]]), 1)!;
    expect(values(s)).toEqual([["a", "b", null], ["c", null, null], ["d", null, null]]);
    expect(s.freezeHeader).toBe(false);
  });

  test("a table with only DocAI's cell grid is built from the cells", () => {
    const box = { page: 1, x0: 0, y0: 0, x1: 1, y1: 1 };
    const g = (row: number, col: number, text: string, colSpan = 1): GroundedCell => ({ row, col, text, header: row === 0, rowSpan: 1, colSpan, box });
    const s = tableSheet(seg(null, [g(0, 0, "Head", 2), g(1, 0, "1"), g(1, 1, "x")]), 2)!;
    expect(values(s)).toEqual([["Head", null], [1, "x"]]);
    expect(s.merges).toEqual([{ top: 0, left: 0, bottom: 0, right: 1 }]);
  });

  test("with both, DocAI's cell grid wins: it is what the panel shows and it marks the headers", () => {
    const box = { page: 1, x0: 0, y0: 0, x1: 1, y1: 1 };
    const g = (row: number, col: number, text: string): GroundedCell => ({ row, col, text, header: row === 0, rowSpan: 1, colSpan: 1, box });
    const s = tableSheet(seg([[tc("Qty"), tc("Price")], [tc("1"), tc("2")]], [g(0, 0, "Qty"), g(0, 1, "Price"), g(1, 0, "1"), g(1, 1, "2")]), 1)!;
    expect(s.rows[0].map((c) => c!.header)).toEqual([true, true]);
    expect(s.freezeHeader).toBe(true);
  });

  test("an Arabic cell grid is mirrored, so the right-to-left sheet reads like the page", () => {
    // DocAI's grid counts columns left to right across the page; a right-to-left sheet shows column A on
    // the right, so column A must hold the page's rightmost column
    const box = { page: 1, x0: 0, y0: 0, x1: 1, y1: 1 };
    const g = (row: number, col: number, text: string, colSpan = 1): GroundedCell => ({ row, col, text, header: false, rowSpan: 1, colSpan, box });
    const s = tableSheet(seg(null, [g(0, 0, "10"), g(0, 1, "x"), g(0, 2, "المبلغ"), g(1, 0, "كلي", 2), g(1, 2, "y")]), 1)!;
    expect(s.rtl).toBe(true);
    expect(values(s)).toEqual([["المبلغ", "x", 10], ["y", "كلي", null]]);
    expect(s.merges).toEqual([{ top: 1, left: 1, bottom: 1, right: 2 }]);
  });

  test("Arabic anywhere makes the sheet right-to-left", () => {
    expect(tableSheet(seg([[tc("المبلغ"), tc("10")]]), 1)!.rtl).toBe(true);
  });

  test("nothing to export: null", () => {
    expect(tableSheet(seg(null), 1)).toBeNull();
    expect(tableSheet(seg([]), 1)).toBeNull();
  });
});

const v = (path: string, value: string, confidence: number | null = 0.98): ExtractedValue => ({ path, value, confidence, segmentId: null, box: null });
const ext = [
  v("invoice_number", "ACC-1"),
  v("items[0].quantity", "10"),
  v("items[0].item_name", "Product 1"),
  v("items[1].quantity", "70", null),
  v("items[1].item_name", "Product 2"),
  v("notes", "", null),
];

describe("records", () => {
  test("Fields sheet for single fields, one sheet per list", () => {
    const [fields, items, ...rest] = recordSheets(ext);
    expect(rest).toEqual([]);
    expect(fields.name).toBe("Fields");
    expect(values(fields)).toEqual([["Field", "Value", "Confidence (%)"], ["invoice_number", "ACC-1", 98], ["notes", "", ""]]);
    expect(fields.rows[0].every((c) => c!.header)).toBe(true);
    expect(fields.freezeHeader).toBe(true);
    expect(items.name).toBe("Items");
    expect(values(items)).toEqual([["quantity", "item_name"], [10, "Product 1"], [70, "Product 2"]]);
  });

  test("deeper paths keep their dotted name; lists of plain values use 'value'", () => {
    const [, a, b] = recordSheets([v("x", "1"), v("lines[0].tax.rate", "5"), v("tags[0]", "red")]);
    expect(values(a)).toEqual([["tax.rate"], [5]]);
    expect(values(b)).toEqual([["value"], ["red"]]);
  });

  test("list names become valid, unique sheet names of at most 31 chars", () => {
    const long = "a/b[c]:d*e?f\\g_" + "x".repeat(40);
    const names = recordSheets([v(`${long}[0].q`, "1"), v(`${long.replace("g_", "g-")}[0].q`, "2")]).map((s) => s.name);
    expect(names[0]).toBe("Fields");
    for (const n of names) {
      expect(n.length).toBeLessThanOrEqual(31);
      expect(n).not.toMatch(/[[\]:*?/\\]/);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  test("flat rows for CSV, every path included", () => {
    expect(recordRows(ext)).toEqual([
      ["Field", "Value", "Confidence (%)"],
      ["invoice_number", "ACC-1", 98],
      ["items[0].quantity", 10, 98],
      ["items[0].item_name", "Product 1", 98],
      ["items[1].quantity", 70, ""],
      ["items[1].item_name", "Product 2", 98],
      ["notes", "", ""],
    ]);
  });
});

describe("CSV and file names", () => {
  test("BOM, quoting, CRLF, and formula text made safe", () => {
    expect(toCsv([["a,b", 'x"y'], ["=SUM(A1)", 10], ["+1 call", "@me"], ["line\nbreak", -2]])).toBe(
      '﻿"a,b","x""y"\r\n\'=SUM(A1),10\r\n\'+1 call,\'@me\r\n"line\nbreak",-2\r\n',
    );
  });

  test("text starting with '-' (or a tab) is made safe too; negative numbers stay numbers", () => {
    expect(toCsv([["-د", "-2+3", -2, "\tx"]])).toBe("﻿'-د,'-2+3,-2,'\tx\r\n");
  });

  test("sheetRows turns covered slots into empty cells", () => {
    expect(sheetRows(tableSheet(seg([[tc("Total", true, 1, 2)], [tc("a"), tc("b")]]), 1)!)).toEqual([["Total", ""], ["a", "b"]]);
  });

  test("names come from the source file without its extension", () => {
    expect(exportName("004_receipt.jpg", "table-6", "csv")).toBe("004_receipt-table-6.csv");
    expect(exportName("KSA invoice.png", "records", "xlsx")).toBe("KSA invoice-records.xlsx");
    expect(exportName("README", "table-1", "csv")).toBe("README-table-1.csv");
  });
});
