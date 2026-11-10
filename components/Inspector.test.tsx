import { fireEvent, render, screen } from "@testing-library/react";
import Inspector from "./Inspector";
import PageView from "./PageView";
import { manifest, result } from "./test-fixtures";

const pages = manifest.categories[0].pages;

beforeEach(() => {
  // answer each page's result.json with a result carrying that page's id
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const id = url.replace("/showcase/", "").replace("/result.json", "");
    return { ok: true, json: async () => ({ ...result, id }) };
  }));
});
afterEach(() => vi.unstubAllGlobals());

function setup(index = 0) {
  const onIndex = vi.fn();
  const onClose = vi.fn();
  render(<Inspector pages={pages} index={index} onIndex={onIndex} onClose={onClose} />);
  return { onIndex, onClose };
}

test("arrow keys move within category", async () => {
  const { onIndex } = setup(3);
  fireEvent.keyDown(window, { key: "ArrowRight" });
  expect(onIndex).toHaveBeenLastCalledWith(0);
  fireEvent.keyDown(window, { key: "ArrowLeft" });
  expect(onIndex).toHaveBeenLastCalledWith(2);
});

test("arrow buttons move too", async () => {
  const { onIndex } = setup(0);
  await screen.findByText("receipts.png");
  fireEvent.click(screen.getByRole("button", { name: "Previous type" }));
  expect(onIndex).toHaveBeenLastCalledWith(3);
});

test("escape closes", async () => {
  const { onClose } = setup();
  await screen.findByText("receipts.png");
  fireEvent.keyDown(window, { key: "Escape" });
  expect(onClose).toHaveBeenCalled();
});

test("meta shows position", async () => {
  setup(0);
  expect(await screen.findByText("Financial · Receipts · 1 of 4")).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
});

test("stale result for another page is not shown", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => result })));
  setup(3); // financial_reports, but fetch returns the receipts result
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.queryByText("receipts.png")).not.toBeInTheDocument();
});

test("panel language survives moving to the next page", async () => {
  const { rerender } = render(<Inspector pages={pages} index={0} onIndex={vi.fn()} onClose={vi.fn()} />);
  await screen.findByText("Financial · Receipts · 1 of 4");
  fireEvent.click(screen.getByRole("button", { name: "العربية" }));
  rerender(<Inspector pages={pages} index={1} onIndex={vi.fn()} onClose={vi.fn()} />);
  await screen.findByText("Financial · Receipts · 2 of 4");
  expect(screen.getByRole("region", { name: "DocAI pipeline" })).toHaveAttribute("dir", "rtl");
});

test("fetch failure shows a message", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
  setup(0);
  expect(await screen.findByText(/Could not load this page/)).toBeInTheDocument();
});

test("page view draws page-1 boxes and highlights one", () => {
  const { container } = render(
    <PageView
      result={result}
      boxes={[
        { key: "seg-1", box: { page: 1, x0: 300, y0: 20, x1: 700, y1: 60 } },
        { key: "seg-x", box: { page: 2, x0: 0, y0: 0, x1: 10, y1: 10 } },
      ]}
      highlight="seg-1"
      scanning={false}
    />,
  );
  const drawn = container.querySelectorAll("[data-box]");
  expect(drawn).toHaveLength(1);
  expect(drawn[0]).toHaveAttribute("data-hi");
  expect(drawn[0]).toHaveStyle({ left: "30%", top: "2%", width: "40%", height: "4%" });
});
