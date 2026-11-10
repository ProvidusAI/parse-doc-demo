import { fireEvent, render, screen } from "@testing-library/react";
import DatasetBrowser from "./DatasetBrowser";
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
