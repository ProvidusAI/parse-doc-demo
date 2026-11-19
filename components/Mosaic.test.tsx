import { fireEvent, render, screen } from "@testing-library/react";
import { fitTiles } from "@/lib/mosaic";
import Mosaic, { type MosaicItem } from "./Mosaic";

const items: MosaicItem[] = Array.from({ length: 30 }, (_, i) => ({
  id: `cat/p${i}`,
  label: i % 2 ? "Government" : "Financial",
  sub: `Page ${i}`,
  thumb: `/t${i}.jpg`,
}));

function setup(list = items) {
  const onOpen = vi.fn();
  const onZoom = vi.fn();
  const utils = render(<Mosaic items={list} onOpen={onOpen} onZoom={onZoom} />);
  const box = utils.container.firstElementChild as HTMLElement;
  return { ...utils, onOpen, onZoom, box };
}

test("one tile per page, named by type and category", () => {
  setup();
  expect(screen.getAllByRole("button")).toHaveLength(30);
  expect(screen.getByRole("button", { name: "Page 3 · Government" })).toBeInTheDocument();
});

test("tiles start at the size that fits every page on screen", () => {
  setup();
  const { tileW } = fitTiles(30, 1200, 700, 4);
  expect(screen.getAllByRole("button")[0]).toHaveStyle({ width: `${tileW}px` });
});

test("clicking a tile opens that page", () => {
  const { onOpen } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Page 3 · Government" }));
  expect(onOpen).toHaveBeenCalledWith("cat/p3");
});

test("a drag pans and does not open a page", () => {
  const { onOpen, box } = setup();
  const tile = screen.getByRole("button", { name: "Page 3 · Government" });
  fireEvent.mouseDown(tile, { button: 0, clientX: 100, clientY: 100 });
  fireEvent.mouseMove(window, { clientX: 160, clientY: 120 });
  fireEvent.mouseUp(window, { clientX: 160, clientY: 120 });
  fireEvent.click(tile);
  expect(onOpen).not.toHaveBeenCalled();
  expect(box).toBeInTheDocument();
});

test("Ctrl + scroll zooms in and out; plain scroll does not zoom", () => {
  const { onZoom, box } = setup();
  const start = onZoom.mock.lastCall![0];
  fireEvent.wheel(box, { deltaY: 100 });
  expect(onZoom.mock.lastCall![0]).toBe(start);
  fireEvent.wheel(box, { deltaY: -100, ctrlKey: true });
  const zoomedIn = onZoom.mock.lastCall![0];
  expect(zoomedIn).toBeGreaterThan(start);
  fireEvent.wheel(box, { deltaY: 100, ctrlKey: true });
  expect(onZoom.mock.lastCall![0]).toBeLessThan(zoomedIn);
});

test("zoom resets to fit when the page set changes", () => {
  const { onZoom, box, rerender } = setup();
  const fit = onZoom.mock.lastCall![0];
  fireEvent.wheel(box, { deltaY: -100, ctrlKey: true });
  rerender(<Mosaic items={items.slice(0, 10)} onOpen={vi.fn()} onZoom={onZoom} />);
  expect(onZoom.mock.lastCall![0]).toBeGreaterThan(fit); // fewer pages → bigger fitted tiles, not the old zoom
  expect(screen.getAllByRole("button")).toHaveLength(10);
});

test("a few pages get exactly that many columns, no empty tracks", () => {
  const { container } = setup(items.slice(0, 4));
  const grid = container.querySelector("[class*=grid]") as HTMLElement;
  expect(grid.style.gridTemplateColumns).toMatch(/^repeat\(4, /);
});

test("plain scroll is left to the page (never swallowed)", () => {
  const { box } = setup();
  expect(fireEvent.wheel(box, { deltaY: 120 })).toBe(true); // true = not preventDefault-ed
});
