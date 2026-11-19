// @vitest-environment node
import ExcelJS from "exceljs";
import type { Sheet } from "./export";
import { workbookBlob } from "./xlsx";

const h = (value: string | number) => ({ value, header: true });
const c = (value: string | number) => ({ value, header: false });

const table: Sheet = {
  name: "Table 2",
  rows: [
    [h("Total due"), null, h("Qty")],
    [c("Product with a fairly long name that should widen its column"), c("x"), c(10)],
  ],
  merges: [{ top: 0, left: 0, bottom: 0, right: 1 }],
  rtl: false,
  freezeHeader: true,
};
const arabic: Sheet = { name: "Fields", rows: [[c("المبلغ"), c("230")]], merges: [], rtl: true, freezeHeader: false };

async function read(sheets: Sheet[]) {
  const blob = await workbookBlob(sheets);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await blob.arrayBuffer());
  return { blob, wb };
}

test("an .xlsx blob with one worksheet per sheet, names kept", async () => {
  const { blob, wb } = await read([table, arabic]);
  expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  expect(wb.worksheets.map((w) => w.name)).toEqual(["Table 2", "Fields"]);
});

test("header bold on a light grey fill, every cell bordered, top-aligned and wrapped", async () => {
  const ws = (await read([table])).wb.getWorksheet("Table 2")!;
  expect(ws.getCell("A1").font?.bold).toBe(true);
  expect((ws.getCell("A1").fill as ExcelJS.FillPattern).fgColor?.argb).toBe("FFF3F4F6");
  expect(ws.getCell("A2").font?.bold).toBeFalsy();
  for (const ref of ["A1", "B1", "C1", "A2", "B2", "C2"]) expect(ws.getCell(ref).border?.top?.style).toBe("thin");
  expect(ws.getCell("A2").alignment).toMatchObject({ vertical: "top", wrapText: true });
});

test("merged cells merged, numbers stored as numbers, text as text", async () => {
  const ws = (await read([table])).wb.getWorksheet("Table 2")!;
  expect(ws.getCell("B1").isMerged).toBe(true);
  expect(ws.getCell("B1").master.address).toBe("A1");
  expect(ws.getCell("C2").value).toBe(10);
  expect(ws.getCell("B2").value).toBe("x");
});

test("frozen header row, right-to-left for Arabic, column widths 10–60", async () => {
  const { wb } = await read([table, arabic]);
  const ws = wb.getWorksheet("Table 2")!;
  expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
  expect(ws.views[0].rightToLeft).toBeFalsy();
  expect(wb.getWorksheet("Fields")!.views[0].rightToLeft).toBe(true);
  expect(ws.getColumn(1).width).toBe(60); // long text, clamped
  expect(ws.getColumn(2).width).toBe(10); // short text, floor
  expect(ws.getColumn(3).width).toBe(10);
});
