import { act, fireEvent, render, screen } from "@testing-library/react";
import Inspector, { INTRO_MS } from "./Inspector";
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
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// fake clock that still ticks in real time, so findBy* keeps polling
const fakeClock = () => vi.useFakeTimers({ shouldAdvanceTime: true });
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const pipeline = () => screen.queryByRole("region", { name: "DocAI pipeline" });
const pageEl = () => screen.getByRole("img").parentElement!;
const wrap = () => screen.getByRole("dialog").querySelector("[data-phase]")!;
// wait for the page, then flush its effects so load-started timers begin before the clock moves
const shown = async (text: string) => {
  await screen.findByText(text);
  await act(async () => {});
};

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

test("a slow response for a page you already left is ignored", async () => {
  // page 1 answers late, page 2 answers at once
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    const id = url.replace("/showcase/", "").replace("/result.json", "");
    const body = { ok: true, json: async () => ({ ...result, id, source: { ...result.source, fileName: `${id}.file` } }) };
    return new Promise((r) => setTimeout(() => r(body), id.endsWith("receipts") ? 50 : 0));
  }));
  const { rerender } = render(<Inspector pages={pages} index={0} onIndex={vi.fn()} onClose={vi.fn()} />);
  rerender(<Inspector pages={pages} index={1} onIndex={vi.fn()} onClose={vi.fn()} />);
  expect(await screen.findByText("financial/invoices.file")).toBeInTheDocument();
  await new Promise((r) => setTimeout(r, 80));
  expect(screen.queryByText("financial/receipts.file")).not.toBeInTheDocument();
});

test("panel language survives moving to the next page", async () => {
  fakeClock();
  const { rerender } = render(<Inspector pages={pages} index={0} onIndex={vi.fn()} onClose={vi.fn()} />);
  await screen.findByText("Financial · Receipts · 1 of 4");
  advance(INTRO_MS);
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

test("labelled boxes show their tag in the type colour", () => {
  const { container } = render(
    <PageView
      result={result}
      boxes={[{ key: "seg-2", box: { page: 1, x0: 40, y0: 200, x1: 960, y1: 600 }, type: "table", tag: "2.table" }]}
      highlight={null}
      scanning={false}
    />,
  );
  const box = container.querySelector<HTMLElement>("[data-box]")!;
  expect(box).toHaveTextContent("2.table");
  expect(box.style.getPropertyValue("--c")).toBe("#f97316");
});

test("duplicated pages that share a result file still load", async () => {
  const dupes = [{ ...pages[0], id: "financial/receipts~1" }, { ...pages[0], id: "financial/receipts~2" }];
  render(<Inspector pages={dupes} index={1} onIndex={vi.fn()} onClose={vi.fn()} />);
  expect(await screen.findByText("Financial · Receipts · 2 of 2")).toBeInTheDocument();
});

test("magnifier shows a zoomed lens of the page under the pointer", () => {
  render(<PageView result={result} boxes={[]} highlight={null} scanning={false} />);
  const toggle = screen.getByRole("button", { name: "Magnifier" });
  const page = screen.getByRole("img").parentElement!;
  fireEvent.pointerMove(page, { clientX: 50, clientY: 50 });
  expect(page.querySelector("[data-lens]")).toBeNull(); // off by default

  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-pressed", "true");
  fireEvent.pointerMove(page, { clientX: 50, clientY: 50 });
  const lens = page.querySelector<HTMLElement>("[data-lens]")!;
  expect(lens.style.backgroundImage).toContain(result.page.image);

  fireEvent.pointerLeave(page);
  expect(page.querySelector("[data-lens]")).toBeNull();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-pressed", "false");
});

test("a picked table cell is drawn as its own box on the page", () => {
  const { container } = render(
    <PageView result={result} boxes={[]} highlight={null} scanning={false} cell={{ key: "seg-2#r1c0", box: { page: 1, x0: 100, y0: 200, x1: 300, y1: 250 } }} />,
  );
  const drawn = container.querySelector<HTMLElement>("[data-cell]")!;
  expect(drawn).toHaveStyle({ left: "10%", top: "20%", width: "20%", height: "5%" });
});

test("hovering the page reports the smallest box under the pointer", () => {
  const onHover = vi.fn();
  const boxes = [
    { key: "big", box: { page: 1, x0: 0, y0: 0, x1: 1000, y1: 500 } },
    { key: "small", box: { page: 1, x0: 100, y0: 100, x1: 300, y1: 200 } },
  ];
  render(<PageView result={result} boxes={boxes} highlight={null} scanning={false} onHover={onHover} />);
  const page = screen.getByRole("img").parentElement!;
  // 1000×1000 px page, so client px == 0–1000 box coords
  page.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0, toJSON() {} });
  fireEvent.pointerMove(page, { clientX: 150, clientY: 150 });
  expect(onHover).toHaveBeenLastCalledWith("small");
  fireEvent.pointerMove(page, { clientX: 600, clientY: 400 });
  expect(onHover).toHaveBeenLastCalledWith("big");
  fireEvent.pointerMove(page, { clientX: 600, clientY: 800 });
  expect(onHover).toHaveBeenLastCalledWith(null);
  const calls = onHover.mock.calls.length;
  fireEvent.pointerMove(page, { clientX: 610, clientY: 810 });
  expect(onHover.mock.calls.length).toBe(calls); // only reports changes
  fireEvent.pointerMove(page, { clientX: 150, clientY: 150 });
  fireEvent.pointerLeave(page);
  expect(onHover).toHaveBeenLastCalledWith(null);
});

test("intro shows the page alone, then the panel on Parsed chunks", async () => {
  fakeClock();
  setup(0);
  await shown("receipts.png");
  expect(wrap()).toHaveAttribute("data-phase", "intro");
  expect(pipeline()).toBeNull();
  expect(pageEl()).toHaveClass("scanning");
  advance(INTRO_MS);
  expect(wrap()).toHaveAttribute("data-phase", "ready");
  expect(screen.getByRole("heading", { name: "Parsed chunks & grounding" })).toBeInTheDocument();
  expect(pageEl()).not.toHaveClass("scanning");
});

test("reduced motion skips the intro", async () => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  setup(0);
  await shown("receipts.png");
  expect(wrap()).toHaveAttribute("data-phase", "ready");
  expect(pipeline()).toBeInTheDocument();
  expect(pageEl()).not.toHaveClass("scanning");
});

test("closing during the intro leaves no pending timer", async () => {
  fakeClock();
  const errors = vi.spyOn(console, "error");
  const { unmount } = render(<Inspector pages={pages} index={0} onIndex={vi.fn()} onClose={vi.fn()} />);
  await shown("receipts.png");
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  advance(INTRO_MS * 2);
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

test("arrow during the intro does not restart it", async () => {
  fakeClock();
  const { rerender } = render(<Inspector pages={pages} index={0} onIndex={vi.fn()} onClose={vi.fn()} />);
  await shown("Financial · Receipts · 1 of 4");
  advance(INTRO_MS / 2);
  rerender(<Inspector pages={pages} index={1} onIndex={vi.fn()} onClose={vi.fn()} />);
  await shown("Financial · Receipts · 2 of 4");
  expect(pipeline()).toBeNull();
  advance(INTRO_MS / 2);
  expect(wrap()).toHaveAttribute("data-phase", "ready");
  expect(pipeline()).toBeInTheDocument();
});

test("arrow after the intro replays only the scan", async () => {
  fakeClock();
  const { rerender } = render(<Inspector pages={pages} index={0} onIndex={vi.fn()} onClose={vi.fn()} />);
  await shown("Financial · Receipts · 1 of 4");
  advance(INTRO_MS);
  rerender(<Inspector pages={pages} index={1} onIndex={vi.fn()} onClose={vi.fn()} />);
  await shown("Financial · Receipts · 2 of 4");
  expect(wrap()).toHaveAttribute("data-phase", "ready");
  expect(pipeline()).toBeInTheDocument();
  expect(pageEl()).toHaveClass("scanning");
  advance(INTRO_MS);
  expect(pageEl()).not.toHaveClass("scanning");
});

test("the panel slides in once, when the intro ends, not on arrows", async () => {
  fakeClock();
  const { rerender } = render(<Inspector pages={pages} index={0} onIndex={vi.fn()} onClose={vi.fn()} />);
  await shown("Financial · Receipts · 1 of 4");
  advance(INTRO_MS);
  expect(pipeline()!.parentElement).toHaveAttribute("data-enter");
  rerender(<Inspector pages={pages} index={1} onIndex={vi.fn()} onClose={vi.fn()} />);
  await shown("Financial · Receipts · 2 of 4");
  expect(pipeline()!.parentElement).not.toHaveAttribute("data-enter");
});

// every result.json answers after a second
const slowFetch = () =>
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    const id = url.replace("/showcase/", "").replace("/result.json", "");
    return new Promise((r) => setTimeout(() => r({ ok: true, json: async () => ({ ...result, id }) }), 1000));
  }));

test("a slow load still gets the full intro scan once the page is in", async () => {
  fakeClock();
  slowFetch();
  setup(0);
  advance(1000);
  await shown("receipts.png");
  expect(pageEl()).toHaveClass("scanning");
  advance(INTRO_MS / 2);
  expect(wrap()).toHaveAttribute("data-phase", "intro");
  expect(pipeline()).toBeNull();
  advance(INTRO_MS / 2);
  expect(wrap()).toHaveAttribute("data-phase", "ready");
  expect(pipeline()).toBeInTheDocument();
});

test("a slow load after an arrow still gets the full scan", async () => {
  fakeClock();
  slowFetch();
  const { rerender } = render(<Inspector pages={pages} index={0} onIndex={vi.fn()} onClose={vi.fn()} />);
  advance(1000);
  await shown("Financial · Receipts · 1 of 4");
  advance(INTRO_MS);
  rerender(<Inspector pages={pages} index={1} onIndex={vi.fn()} onClose={vi.fn()} />);
  advance(1000);
  await shown("Financial · Receipts · 2 of 4");
  expect(pageEl()).toHaveClass("scanning");
  advance(INTRO_MS / 2);
  expect(pageEl()).toHaveClass("scanning");
  advance(INTRO_MS / 2);
  expect(pageEl()).not.toHaveClass("scanning");
});
