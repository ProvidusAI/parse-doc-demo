import { hidePages, mergeManifests } from "./manifest";
import type { Manifest, PageSummary } from "./types";

const page = (id: string): PageSummary => ({ id, subCategoryLabel: id, fileName: `${id}.jpg`, thumb: "", result: "" });
const base: Manifest = {
  generatedAt: "t",
  categories: [{ key: "financial", label: "Financial", pages: [page("financial/receipts")] }],
};

test("local pages join their category after the committed ones; new categories are added", () => {
  const local: Manifest = {
    generatedAt: "l",
    categories: [
      { key: "financial", label: "Financial", pages: [page("e4c/a_p1")] },
      { key: "research", label: "Research", pages: [page("e4c/b_p1")] },
    ],
  };
  const m = mergeManifests(base, local);
  expect(m.categories.map((c) => [c.key, c.pages.map((p) => p.id)])).toEqual([
    ["financial", ["financial/receipts", "e4c/a_p1"]],
    ["research", ["e4c/b_p1"]],
  ]);
  expect(base.categories[0].pages).toHaveLength(1); // the committed manifest is not changed
});

test("no local manifest: the committed one as it is", () => {
  expect(mergeManifests(base, null)).toBe(base);
});


test("listed pages are left out; categories keep their order and the rest of their pages", () => {
  const m: Manifest = {
    generatedAt: "t",
    categories: [
      { key: "financial", label: "Financial", pages: [page("a"), page("b"), page("c")] },
      { key: "research", label: "Research", pages: [page("d")] },
    ],
  };
  expect(hidePages(m, ["b", "d"]).categories.map((c) => [c.key, c.pages.map((p) => p.id)])).toEqual([
    ["financial", ["a", "c"]],
    ["research", []],
  ]);
  expect(m.categories[0].pages).toHaveLength(3); // the input is not changed
});
