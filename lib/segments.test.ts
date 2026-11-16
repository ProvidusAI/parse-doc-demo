import { pickKey, pickUnits, segmentHex, segmentTag } from "./segments";

test("type colours match DocAI, unknown types fall back to other", () => {
  expect(segmentHex("table")).toBe("#f97316");
  expect(segmentHex("title")).toBe("#ef4444");
  expect(segmentHex("mystery")).toBe(segmentHex("other"));
});

test("corner tag is chunk number and wire type, like DocAI", () => {
  expect(segmentTag(9, "figure")).toBe("9.figure");
  expect(segmentTag(3, "page_number")).toBe("3.page_number");
  expect(segmentTag(2, "mystery")).toBe("2.other");
});

describe("cell picking follows DocAI's cellGrid rule", () => {
  const b = (x0: number, y0: number) => ({ page: 1, x0, y0, x1: x0 + 100, y1: y0 + 20 });
  const c = (row: number, col: number, text: string) => ({ row, col, text, header: false, rowSpan: 1, colSpan: 1, box: b(col * 100, row * 20) });
  const cells = [c(0, 0, "Item"), c(0, 1, "Qty"), c(1, 0, "Product 1"), c(1, 1, "10")];

  test("both axes measured: one unit per cell", () => {
    const units = pickUnits("t", cells, { rows: "detected", cols: "detected" });
    expect(units.map((u) => u.key)).toEqual(["t#r0c0", "t#r0c1", "t#r1c0", "t#r1c1"]);
    expect(units[2]).toEqual({ key: "t#r1c0", box: b(0, 20), text: "Product 1", kind: "cell" });
    expect(pickKey("t", cells[3], { rows: "detected", cols: "detected" })).toBe("t#r1c1");
  });

  test("no cellGrid counts as measured", () => {
    expect(pickUnits("t", cells, null)).toHaveLength(4);
  });

  test("columns estimated: the whole row band", () => {
    const grid = { rows: "detected", cols: "estimated" } as const;
    expect(pickUnits("t", cells, grid)).toEqual([
      { key: "t#r0", box: { page: 1, x0: 0, y0: 0, x1: 200, y1: 20 }, text: "Item · Qty", kind: "row" },
      { key: "t#r1", box: { page: 1, x0: 0, y0: 20, x1: 200, y1: 40 }, text: "Product 1 · 10", kind: "row" },
    ]);
    expect(pickKey("t", cells[3], grid)).toBe("t#r1");
  });

  test("rows estimated: the whole column band", () => {
    const grid = { rows: "estimated", cols: "detected" } as const;
    expect(pickUnits("t", cells, grid).map((u) => [u.key, u.kind])).toEqual([["t#c0", "column"], ["t#c1", "column"]]);
    expect(pickKey("t", cells[3], grid)).toBe("t#c1");
  });

  test("both estimated: still one unit per cell, so every table stays clickable", () => {
    const grid = { rows: "estimated", cols: "estimated" } as const;
    expect(pickUnits("t", cells, grid).map((u) => [u.key, u.kind])).toEqual([
      ["t#r0c0", "cell"], ["t#r0c1", "cell"], ["t#r1c0", "cell"], ["t#r1c1", "cell"],
    ]);
    expect(pickKey("t", cells[0], grid)).toBe("t#r0c0");
  });
});
