import { fireEvent, render, screen } from "@testing-library/react";
import DatasetBrowser from "./DatasetBrowser";
import { expandForStress } from "@/lib/showcase";
import { manifest } from "./test-fixtures";

function setup(active = "financial") {
  const onActive = vi.fn();
  const onOpen = vi.fn();
  render(<DatasetBrowser manifest={manifest} active={active} onActive={onActive} onOpen={onOpen} />);
  return { onActive, onOpen };
}

test("tabs show counts and switch category", () => {
  const { onActive } = setup();
  const tab = screen.getByRole("tab", { name: /Government/ });
  expect(tab).toHaveTextContent("1");
  expect(screen.getByRole("tab", { name: /Financial/ })).toHaveAttribute("aria-selected", "true");
  fireEvent.click(tab);
  expect(onActive).toHaveBeenCalledWith("government");
});

const fitPage = () => fireEvent.click(screen.getByRole("button", { name: "Fit page" }));

test("Grid is the default view: a mosaic of tiles, ParseBench style", () => {
  setup("all");
  expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByRole("button", { name: / · / })).toHaveLength(5);
  expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  expect(screen.getByText(/scroll to zoom · Drag to pan · Click to inspect/)).toBeInTheDocument();
  expect(screen.getByLabelText("Zoom")).toHaveTextContent(/%$/);
});

test("heading shows active category and count", () => {
  setup();
  fitPage();
  expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Financial");
  expect(screen.getByText("4 document types · 1 page each")).toBeInTheDocument();
});

test("card opens inspector", () => {
  const { onOpen } = setup();
  fireEvent.click(screen.getByRole("button", { name: /Receipts/ }));
  expect(onOpen).toHaveBeenCalledWith("financial/receipts");
});

test("search filters pages", () => {
  setup();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "invoice" } });
  expect(screen.getAllByRole("button", { name: /Invoices|Receipts|Utility|Financial reports/ })).toHaveLength(1);
});

test("empty search state", () => {
  setup();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
  expect(screen.getByText("No pages match")).toBeInTheDocument();
});

test("fit page shows captioned cards", () => {
  setup();
  const fit = screen.getByRole("button", { name: "Fit page" });
  fireEvent.click(fit);
  expect(fit).toHaveAttribute("aria-pressed", "true");
});

test("empty manifest shows a notice", () => {
  render(
    <DatasetBrowser manifest={{ generatedAt: "", categories: [] }} active="" onActive={vi.fn()} onOpen={vi.fn()} />,
  );
  expect(screen.getByText(/No showcase pages yet/)).toBeInTheDocument();
});

test("All tab comes first with the total count", () => {
  const { onActive } = setup();
  const tabs = screen.getAllByRole("tab");
  expect(tabs[0]).toHaveTextContent("All");
  expect(tabs[0]).toHaveTextContent("5");
  fireEvent.click(tabs[0]);
  expect(onActive).toHaveBeenCalledWith("all");
});

test("Fit page in All groups every page under its category", () => {
  setup("all");
  fitPage();
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Financial", "Government"]);
  expect(screen.getAllByRole("button", { name: /1 page/ })).toHaveLength(5);
});

test("search in All keeps categories that still match", () => {
  setup("all");
  fitPage();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "regul" } });
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Government"]);
});

test("card stagger is capped for long lists", () => {
  render(<DatasetBrowser manifest={expandForStress(manifest, 300)} active="all" onActive={vi.fn()} onOpen={vi.fn()} />);
  fitPage();
  const cards = screen.getAllByRole("button", { name: /1 page/ });
  expect(cards).toHaveLength(300);
  const delays = cards.map((c) => parseInt(c.style.animationDelay || "0", 10));
  expect(Math.max(...delays)).toBeLessThanOrEqual(840);
});

test("dropdown lists every category with counts and switches tab", () => {
  const { onActive } = setup();
  const select = screen.getByRole("combobox", { name: "All categories" });
  const total = manifest.categories.reduce((n, c) => n + c.pages.length, 0);
  expect(select.querySelectorAll("option")).toHaveLength(manifest.categories.length + 1);
  expect(select.querySelector("option")).toHaveTextContent(`All (${total})`);
  fireEvent.change(select, { target: { value: manifest.categories[1].key } });
  expect(onActive).toHaveBeenCalledWith(manifest.categories[1].key);
});

test("dropdown shows the active category", () => {
  setup("government");
  expect(screen.getByRole("combobox", { name: "All categories" })).toHaveValue("government");
});

test("active chip is scrolled clear of the strip edges and the right fade", () => {
  const { rerender } = render(
    <DatasetBrowser manifest={manifest} active="financial" onActive={vi.fn()} onOpen={vi.fn()} />,
  );
  const strip = screen.getByRole("tablist");
  const def = (el: Element, v: Record<string, number>) =>
    Object.entries(v).forEach(([k, value]) => Object.defineProperty(el, k, { value, writable: true, configurable: true }));
  def(strip, { clientWidth: 300, scrollLeft: 100 });
  def(screen.getByRole("tab", { name: /Financial/ }), { offsetLeft: 20, offsetWidth: 80 });
  def(screen.getByRole("tab", { name: /Government/ }), { offsetLeft: 380, offsetWidth: 90 });
  const show = (key: string) =>
    rerender(<DatasetBrowser manifest={manifest} active={key} onActive={vi.fn()} onOpen={vi.fn()} />);
  show("all");
  def(screen.getByRole("tab", { name: /All/ }), { offsetLeft: 0, offsetWidth: 50 });
  show("government"); // right edge 470 > 100+300-40: scroll so it ends 40px before the edge
  expect(strip.scrollLeft).toBe(470 - 300 + 40);
  show("financial"); // left 20 < 210: scroll to its left edge
  expect(strip.scrollLeft).toBe(20);
});
