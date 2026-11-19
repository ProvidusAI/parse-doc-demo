import { act, fireEvent, render, screen } from "@testing-library/react";
import Showcase from "./Showcase";
import { manifest } from "./test-fixtures";

beforeEach(() => {
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

function stat(label: string) {
  return screen.getByText(label).previousElementSibling?.textContent;
}

test("hero shows manifest counts", () => {
  render(<Showcase manifest={manifest} />);
  expect(stat("Categories")).toBe("2");
  expect(stat("Document types")).toBe("5");
  expect(stat("Pipeline stages")).toBe("5");
});

test("scroll sets data-on-data", () => {
  const { container } = render(<Showcase manifest={manifest} />);
  const root = container.firstElementChild!;
  expect(root).not.toHaveAttribute("data-on-data");
  act(() => {
    Object.defineProperty(window, "scrollY", { value: 500, configurable: true });
    fireEvent.scroll(window);
  });
  expect(root).toHaveAttribute("data-on-data");
});

test("hero copy is present in both scripts", () => {
  render(<Showcase manifest={manifest} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Document intelligence that reads Arabic");
  expect(screen.getByText("ذكاء المستندات باللغتين العربية والإنجليزية")).toBeInTheDocument();
});

test("Try DocAI opens the Providus platform in a new tab", () => {
  render(<Showcase manifest={manifest} />);
  const link = screen.getByRole("link", { name: "Try DocAI" });
  expect(link).toHaveAttribute("href", "https://platform.providus.ai/");
  expect(link).toHaveAttribute("target", "_blank");
});

test("an open page marks the root so the grid's hint hides behind it", () => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  const { container } = render(<Showcase manifest={manifest} />);
  const root = container.firstElementChild!;
  expect(root).not.toHaveAttribute("data-inspecting");
  fireEvent.click(screen.getAllByRole("button", { name: /Receipts/ })[0]);
  expect(root).toHaveAttribute("data-inspecting");
  vi.unstubAllGlobals();
});

test("All is the default tab", () => {
  render(<Showcase manifest={manifest} />);
  expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-selected", "true");
});

test("?stress=N duplicates pages to N for load testing", async () => {
  window.history.pushState({}, "", "/?stress=40");
  render(<Showcase manifest={manifest} />);
  expect(await screen.findAllByRole("button", { name: / · / })).toHaveLength(40);
  window.history.pushState({}, "", "/");
});
