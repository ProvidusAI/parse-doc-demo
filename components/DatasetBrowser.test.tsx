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

test("heading shows active category and count", () => {
  setup();
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

test("fit page toggle", () => {
  setup();
  const fit = screen.getByRole("button", { name: "Fit page" });
  fireEvent.click(fit);
  expect(fit).toHaveAttribute("aria-pressed", "true");
});

test("empty manifest shows a notice", () => {
  render(
    <DatasetBrowser manifest={{ generatedAt: "", wall: [], categories: [] }} active="" onActive={vi.fn()} onOpen={vi.fn()} />,
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

test("All view groups every page under its category", () => {
  setup("all");
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Financial", "Government"]);
  expect(screen.getAllByRole("button", { name: /1 page/ })).toHaveLength(5);
});

test("search in All keeps categories that still match", () => {
  setup("all");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "regul" } });
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Government"]);
});

test("card stagger is capped for long lists", () => {
  render(<DatasetBrowser manifest={expandForStress(manifest, 300)} active="all" onActive={vi.fn()} onOpen={vi.fn()} />);
  const cards = screen.getAllByRole("button", { name: /1 page/ });
  expect(cards).toHaveLength(300);
  const delays = cards.map((c) => parseInt(c.style.animationDelay || "0", 10));
  expect(Math.max(...delays)).toBeLessThanOrEqual(840);
});
