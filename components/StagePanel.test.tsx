import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import type { UiLang } from "@/lib/i18n";
import type { ShowcaseResult } from "@/lib/types";
import { tableSheet } from "@/lib/export";
import { workbookBlob } from "@/lib/xlsx";
import StagePanel from "./StagePanel";
import { result } from "./test-fixtures";

vi.mock("@/lib/xlsx", () => ({ workbookBlob: vi.fn(async () => new Blob(["xlsx"])) }));

type Props = { r: ShowcaseResult; onView: () => void; onHighlight: () => void; highlight?: string | null };
function Harness({ r, onView, onHighlight, highlight = null }: Props) {
  const [lang, setLang] = useState<UiLang>("en");
  return (
    <StagePanel result={r} lang={lang} onLang={setLang} onView={onView} onHighlight={onHighlight} highlight={highlight} />
  );
}

test("chunk card: number, type and page on top, content full width below", () => {
  setup();
  const card = screen.getByText("TAX INVOICE فاتورة ضريبية").closest("li")!;
  const head = card.querySelector("[data-chunk-head]")!;
  expect(head).toHaveTextContent("#1");
  expect(head).toHaveTextContent("HEADER");
  expect(head).toHaveTextContent("P.1");
  expect(head).not.toHaveTextContent("TAX INVOICE");
});

test("a chunk highlighted from the page is marked and scrolled into the panel", () => {
  const scrollTo = vi.fn();
  Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
  const { rerender, onView, onHighlight } = setup();
  scrollTo.mockClear();
  const card = screen.getByRole("table").closest("li")!;
  // jsdom has no layout: put the card below the panel's visible area
  Object.defineProperty(card, "offsetTop", { configurable: true, value: 900 });
  Object.defineProperty(card, "offsetHeight", { configurable: true, value: 60 });
  rerender(<Harness r={result} onView={onView} onHighlight={onHighlight} highlight="seg-2" />);
  expect(card).toHaveAttribute("data-hi");
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
});

function setup(r = result) {
  const onView = vi.fn();
  const onHighlight = vi.fn();
  const utils = render(<Harness r={r} onView={onView} onHighlight={onHighlight} />);
  return { ...utils, onView, onHighlight };
}

const step = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }));
const heading = () => screen.getByRole("heading", { level: 3 });

test("starts on parsed chunks with the engine DocAI used", () => {
  setup();
  expect(heading()).toHaveTextContent("Parsed chunks & grounding");
  expect(screen.queryByRole("button", { name: /Parsing & OCR/ })).not.toBeInTheDocument();
  expect(screen.getByText("OCR engine").closest("li")).toHaveTextContent("GLM-OCR");
  expect(screen.getByText("OCR model").closest("li")).toHaveTextContent("docai-arabic-ocr-e4c");
  expect(screen.getAllByText("TABLE")).toHaveLength(2); // count chip + the chunk row tag
  expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
});

test("table chunks render as a grid", () => {
  setup();
  expect(screen.getByRole("columnheader", { name: "Item" })).toBeInTheDocument();
  const cell = screen.getByRole("cell", { name: "Product 1" });
  expect(within(cell).getByText("Product 1")).toHaveAttribute("dir", "auto");
  expect(screen.getByRole("table")).toBeInTheDocument();
});

const box = (x0: number, y0: number) => ({ page: 1, x0, y0, x1: x0 + 100, y1: y0 + 20 });
const cell = (row: number, col: number, text: string, header = false) => ({ row, col, text, header, rowSpan: 1, colSpan: 1, box: box(col * 100, row * 20) });
const withCells = (cellGrid: { rows: "detected" | "estimated"; cols: "detected" | "estimated" }) => ({
  ...result,
  segments: result.segments.map((s) =>
    s.id === "seg-2"
      ? { ...s, cells: [cell(0, 0, "Item", true), cell(0, 1, "Qty", true), cell(1, 0, "Product 1"), cell(1, 1, "10")], cellGrid }
      : s,
  ),
});

test("table cells are clickable and ground the cell on the page, like DocAI", () => {
  const onCell = vi.fn();
  // the picked cell is owned by the Inspector so the page and the grid stay in step
  const r = withCells({ rows: "detected", cols: "detected" }); // stable, like the Inspector's loaded result
  function Picked() {
    const [picked, setPicked] = useState<string | null>(null);
    return (
      <StagePanel
        result={r}
        lang="en"
        onLang={vi.fn()}
        onView={vi.fn()}
        onHighlight={vi.fn()}
        pickedCell={picked}
        onCell={(c) => {
          onCell(c);
          setPicked(c?.key ?? null);
        }}
      />
    );
  }
  render(<Picked />);
  const pick = screen.getByRole("button", { name: "Product 1" });
  fireEvent.click(pick);
  expect(onCell).toHaveBeenLastCalledWith({ key: "seg-2#r1c0", box: box(0, 20) });
  expect(pick).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(pick); // clicking the picked cell again clears it
  expect(onCell).toHaveBeenLastCalledWith(null);
  expect(pick).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("columnheader", { name: "Item" })).toBeInTheDocument();
  expect(screen.queryByText(/estimated/)).not.toBeInTheDocument(); // precise grid: no note
});

test("a cell picked on the page shows as picked in the grid", () => {
  render(<StagePanel result={withCells({ rows: "detected", cols: "detected" })} lang="en" onLang={vi.fn()} onView={vi.fn()} onHighlight={vi.fn()} pickedCell="seg-2#r1c1" />);
  expect(screen.getByRole("button", { name: "10" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Product 1" })).toHaveAttribute("aria-pressed", "false");
});

test("columns estimated: picking a cell picks its whole row, like DocAI's cellGrid rule", () => {
  const onCell = vi.fn();
  render(<StagePanel result={withCells({ rows: "detected", cols: "estimated" })} lang="en" onLang={vi.fn()} onView={vi.fn()} onHighlight={vi.fn()} onCell={onCell} pickedCell="seg-2#r1" />);
  expect(screen.getByRole("button", { name: "Product 1" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "10" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Qty" })).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(screen.getByRole("button", { name: "Qty" }));
  expect(onCell).toHaveBeenLastCalledWith({ key: "seg-2#r0", box: { page: 1, x0: 0, y0: 0, x1: 200, y1: 20 } });
});

test("both axes estimated: each cell is still pickable on its own", () => {
  const onCell = vi.fn();
  render(<StagePanel result={withCells({ rows: "estimated", cols: "estimated" })} lang="en" onLang={vi.fn()} onView={vi.fn()} onHighlight={vi.fn()} onCell={onCell} />);
  fireEvent.click(screen.getByRole("button", { name: "Product 1" }));
  expect(onCell).toHaveBeenLastCalledWith(expect.objectContaining({ key: "seg-2#r1c0" }));
});

const rect = (el: Element, r: { top: number; bottom: number; left: number; right: number }) => {
  el.getBoundingClientRect = () => ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON() {} });
};

test("a cell picked on the page scrolls into view in the table and the panel", () => {
  const r = withCells({ rows: "detected", cols: "detected" });
  const props = { result: r, lang: "en" as const, onLang: vi.fn(), onView: vi.fn(), onHighlight: vi.fn() };
  const { rerender } = render(<StagePanel {...props} pickedCell={null} />);
  const btn = screen.getByRole("button", { name: "10" });
  const wrap = btn.closest("table")!.parentElement!;
  const panel = btn.closest<HTMLElement>("[data-scroll]")!;
  wrap.scrollTo = vi.fn();
  panel.scrollTo = vi.fn();
  rect(wrap, { top: 100, bottom: 324, left: 0, right: 300 });
  rect(btn, { top: 400, bottom: 420, left: 350, right: 450 }); // below and right of the table's scroll box
  rect(panel, { top: 0, bottom: 800, left: 0, right: 600 }); // the table itself is already in view
  rerender(<StagePanel {...props} pickedCell="seg-2#r1c1" />);
  expect(wrap.scrollTo).toHaveBeenCalledWith({ top: 108, left: 162, behavior: "smooth" });
  expect(panel.scrollTo).not.toHaveBeenCalled();
});

test("no cell-accuracy note is shown, even for estimated grids", () => {
  render(<StagePanel result={withCells({ rows: "estimated", cols: "estimated" })} lang="en" onLang={vi.fn()} onView={vi.fn()} onHighlight={vi.fn()} />);
  expect(screen.queryByText(/estimated/i)).not.toBeInTheDocument();
});

test("page with no segments still shows the engine row", () => {
  setup({ ...result, segments: [] });
  expect(screen.getByText("OCR engine")).toBeInTheDocument();
  expect(screen.getByText("Not returned by DocAI")).toBeInTheDocument();
});

test("clicking a step switches body", () => {
  setup();
  step(/Split result/);
  expect(heading()).toHaveTextContent("Split result");
  expect(screen.getByText("Tax invoice")).toBeInTheDocument();
  expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
});

test("view state is boxes only, tagged by chunk", () => {
  const { onView } = setup();
  expect(onView).toHaveBeenLastCalledWith({ boxes: expect.any(Array) });
  expect(onView.mock.lastCall![0].boxes).toHaveLength(3);
});

test("chunks step labels every box with its number and type", () => {
  const { onView } = setup();
  const boxes = onView.mock.lastCall![0].boxes;
  expect(boxes.map((b: { tag: string }) => b.tag)).toEqual(["1.header", "2.table", "3.logo"]);
  expect(boxes[1]).toMatchObject({ key: "seg-2", type: "table" });
});

test("chunk hover highlights", () => {
  const { onHighlight } = setup();
  step(/Parsed chunks/);
  const row = screen.getByText("TAX INVOICE فاتورة ضريبية").closest("li")!;
  fireEvent.mouseEnter(row);
  expect(onHighlight).toHaveBeenLastCalledWith("seg-1");
  fireEvent.mouseLeave(row);
  expect(onHighlight).toHaveBeenLastCalledWith(null);
});

test("chunk text uses dir auto", () => {
  setup();
  step(/Parsed chunks/);
  const text = screen.getByText("TAX INVOICE فاتورة ضريبية");
  expect(text).toHaveAttribute("dir", "auto");
  expect(text).toHaveClass("ar");
});

const stepButtons = () => screen.getAllByRole("button").filter((b) => b.querySelector("i"));

test("shows only the steps DocAI returned", () => {
  setup({ ...result, split: null, extraction: null, splitRules: null, schema: null });
  expect(screen.getByRole("button", { name: /Parsed chunks/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Split rules|Split result|Extract rules|Extracted schema/ })).not.toBeInTheDocument();
  expect(stepButtons()).toHaveLength(1);
  expect(screen.getByText("Step 1 of 1")).toBeInTheDocument();
});

test("a missing extraction drops only that step", () => {
  setup({ ...result, extraction: null });
  expect(stepButtons()).toHaveLength(4);
  expect(screen.queryByRole("button", { name: /Extracted schema/ })).not.toBeInTheDocument();
  expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
});

test("a full result shows all five steps", () => {
  setup();
  expect(stepButtons()).toHaveLength(5);
  expect(stepButtons().map((b) => b.querySelector("i")!.textContent)).toEqual(["1", "2", "3", "4", "5"]);
  expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
});

test("step numbers count only the visible steps", () => {
  setup({ ...result, splitRules: null, split: null });
  expect(stepButtons().map((b) => b.textContent)).toEqual(["1Parsed chunks", "2Extract rules", "3Extracted schema"]);
  step(/Extracted schema/);
  expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
});

test("no invented confidence", () => {
  setup();
  step(/Extracted schema/);
  const total = screen.getByText("total_amount").closest("li")!;
  expect(within(total).getByText("97%")).toBeInTheDocument();
  const supplier = screen.getByText("supplier_name").closest("li")!;
  expect(supplier.textContent).not.toMatch(/%/);
});

test("extracted value click highlights its box", () => {
  const { onHighlight, onView } = setup();
  step(/Extracted schema/);
  expect(onView.mock.lastCall![0].boxes).toEqual([{ key: "total_amount", box: result.extraction!.values[0].box }]);
  fireEvent.click(screen.getByText("1150.00"));
  expect(onHighlight).toHaveBeenLastCalledWith("total_amount");
});

test("json view shows raw extraction", () => {
  setup();
  step(/Extracted schema/);
  fireEvent.click(screen.getByRole("button", { name: "JSON" }));
  expect(screen.getByText(/"total_amount": "1150.00"/)).toBeInTheDocument();
});

test("arabic toggle flips direction", () => {
  const { container } = setup();
  fireEvent.click(screen.getByRole("button", { name: "العربية" }));
  const root = container.firstElementChild!;
  expect(root).toHaveAttribute("dir", "rtl");
  expect(root).toHaveAttribute("lang", "ar");
  expect(screen.getByText("الخطوة 1 من 5")).toBeInTheDocument();
});

test("resets to first step for a new page", () => {
  const { rerender, onView, onHighlight } = setup();
  step(/Split rules/);
  rerender(<Harness r={{ ...result, id: "financial/invoices" }} onView={onView} onHighlight={onHighlight} />);
  expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
});

test("no parse time recorded: no parse time card (never invented)", () => {
  setup({ ...result, upload: { ...result.upload, elapsedSeconds: null } });
  expect(screen.queryByText("Parse time")).not.toBeInTheDocument();
  expect(screen.getByText("OCR engine")).toBeInTheDocument();
});

test("a recorded parse time is shown", () => {
  setup();
  expect(screen.getByText("Parse time").closest("li")).toHaveTextContent("45.6 s");
});

test("chunk without a box shows no page number", () => {
  setup({ ...result, segments: [{ ...result.segments[0], box: null }] });
  step(/Parsed chunks/);
  expect(screen.getByText("TAX INVOICE فاتورة ضريبية").closest("li")!.textContent).not.toMatch(/P\.\d/);
});

test("model-written names keep their own direction", () => {
  setup();
  step(/Extract rules/);
  expect(screen.getByText("total_amount")).toHaveAttribute("dir", "auto");
  step(/Extracted schema/);
  expect(screen.getByText("supplier_name")).toHaveAttribute("dir", "auto");
  step(/Split result/);
  expect(screen.getByText("invoice")).toHaveAttribute("dir", "auto");
});

test("paddle engine is named as such", () => {
  setup({ ...result, upload: { ...result.upload, ocrEngine: "paddle-vl", ocrModel: "translate-studio/paddleocr-vl-1.6" } });
  expect(screen.getByText("OCR engine").closest("li")).toHaveTextContent("PaddleOCR-VL");
});

test("choosing a step scrolls only the stepper, never the panel", () => {
  const intoView = vi.fn();
  const scrollTo = vi.fn();
  Element.prototype.scrollIntoView = intoView;
  Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
  setup();
  step(/Extracted schema/);
  expect(intoView).not.toHaveBeenCalled();
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
});

describe("Excel and CSV downloads", () => {
  let saved: { name: string; blob: Blob }[];
  beforeEach(() => {
    saved = [];
    let last: Blob;
    URL.createObjectURL = vi.fn((b: Blob) => ((last = b), "blob:x"));
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      saved.push({ name: this.download, blob: last });
    });
    vi.mocked(workbookBlob).mockClear();
  });
  const card = (text: string) => screen.getByText(text).closest("li")!;
  // Blob.text() drops a leading BOM, so decode the bytes as they are
  const raw = async (b: Blob) => new TextDecoder("utf-8", { ignoreBOM: true }).decode(await b.arrayBuffer());

  test("a table card offers Excel and CSV; other cards do not", () => {
    setup();
    const table = screen.getByRole("table").closest("li")!;
    expect(within(table).getByRole("button", { name: "Download as Excel" })).toHaveTextContent("Excel");
    expect(within(table).getByRole("button", { name: "Download as CSV" })).toHaveTextContent("CSV");
    expect(within(card("TAX INVOICE فاتورة ضريبية")).queryByRole("button", { name: /Download/ })).not.toBeInTheDocument();
  });

  test("a table with no rows and no cells offers nothing", () => {
    setup({ ...result, segments: [{ ...result.segments[1], table: { rows: [] }, cells: null }] });
    expect(screen.queryByRole("button", { name: /Download/ })).not.toBeInTheDocument();
  });

  test("CSV: the table as DocAI read it, named after the source file", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Download as CSV" }));
    expect(saved.map((s) => s.name)).toEqual(["receipts-table-2.csv"]);
    expect(await raw(saved[0].blob)).toBe("\uFEFFItem,Qty\r\nProduct 1,10\r\n");
  });

  test("Excel: ExcelJS builds the sheet once, even on a double click", async () => {
    setup();
    const excel = screen.getByRole("button", { name: "Download as Excel" });
    fireEvent.click(excel);
    fireEvent.click(excel);
    await vi.waitFor(() => expect(saved.map((s) => s.name)).toEqual(["receipts-table-2.xlsx"]));
    expect(workbookBlob).toHaveBeenCalledTimes(1);
    expect(workbookBlob).toHaveBeenCalledWith([tableSheet(result.segments[1], 2)]);
  });

  test("the extracted record downloads as Excel sheets or a flat CSV", async () => {
    setup();
    step(/Extracted schema/);
    fireEvent.click(screen.getByRole("button", { name: "Download as CSV" }));
    expect(saved[0].name).toBe("receipts-records.csv");
    expect(await raw(saved[0].blob)).toBe(
      "\uFEFFField,Value,Confidence (%)\r\ntotal_amount,1150.00,97\r\nsupplier_name,شركة تجريبية,\r\n",
    );
    fireEvent.click(screen.getByRole("button", { name: "Download as Excel" }));
    await vi.waitFor(() => expect(saved.map((s) => s.name)).toContain("receipts-records.xlsx"));
    expect(vi.mocked(workbookBlob).mock.calls[0][0].map((s) => s.name)).toEqual(["Fields"]);
  });

  test("Arabic panel: Arabic labels, same Excel / CSV text", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "العربية" }));
    const table = screen.getByRole("table").closest("li")!;
    expect(within(table).getByRole("button", { name: "تنزيل بصيغة Excel" })).toHaveTextContent("Excel");
    expect(within(table).getByRole("button", { name: "تنزيل بصيغة CSV" })).toHaveTextContent("CSV");
  });
});
