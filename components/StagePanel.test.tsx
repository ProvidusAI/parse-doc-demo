import { fireEvent, render, screen, within } from "@testing-library/react";
import StagePanel from "./StagePanel";
import { result } from "./test-fixtures";

function setup(r = result) {
  const onView = vi.fn();
  const onHighlight = vi.fn();
  const utils = render(<StagePanel result={r} onView={onView} onHighlight={onHighlight} />);
  return { ...utils, onView, onHighlight };
}

const step = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }));
const heading = () => screen.getByRole("heading", { level: 3 });

test("starts on upload with real job values", () => {
  setup();
  expect(heading()).toHaveTextContent("Document ingestion");
  expect(screen.getByText("glm-ocr")).toBeInTheDocument();
  expect(screen.getByText("docai-arabic-ocr-e4c")).toBeInTheDocument();
  expect(screen.getByText("Step 1 of 7")).toBeInTheDocument();
});

test("clicking a step switches body", () => {
  setup();
  step(/Split result/);
  expect(heading()).toHaveTextContent("Split result");
  expect(screen.getByText("Tax invoice")).toBeInTheDocument();
  expect(screen.getByText("Step 5 of 7")).toBeInTheDocument();
});

test("ocr step scans and draws every region", () => {
  const { onView } = setup();
  step(/Parsing & OCR/);
  expect(onView).toHaveBeenLastCalledWith({ scanning: true, boxes: expect.any(Array) });
  expect(onView.mock.lastCall![0].boxes).toHaveLength(3);
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

test("renders null stages", () => {
  setup({ ...result, split: null, extraction: null, splitRules: null, schema: null });
  for (const name of [/Split rules/, /Split result/, /Extract rules/, /Extracted schema/]) {
    step(name);
    expect(screen.getByText("Not returned by DocAI")).toBeInTheDocument();
  }
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
  expect(screen.getByRole("button", { name: /الرفع/ })).toBeInTheDocument();
  expect(screen.getByText("الخطوة 1 من 7")).toBeInTheDocument();
});

test("resets to first step for a new page", () => {
  const { rerender, onView, onHighlight } = setup();
  step(/Split rules/);
  rerender(<StagePanel result={{ ...result, id: "financial/invoices" }} onView={onView} onHighlight={onHighlight} />);
  expect(screen.getByText("Step 1 of 7")).toBeInTheDocument();
});
