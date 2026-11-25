import { METRICS, overall, ranked, SYSTEMS, type System } from "./leaderboard";

const sys = (id: string, s: number, ci = 1): System => ({
  id, name: id, nameAr: id, kind: "api",
  scores: { ar: { text: s, tables: s, order: s, grounding: s }, en: { text: s, tables: s, order: s, grounding: s } },
  ci: { ar: ci, en: ci },
});

test("overall is the plain mean of the four task scores", () => {
  const s: System = { ...sys("x", 0), scores: { ...sys("x", 0).scores, ar: { text: 90, tables: 70, order: 80, grounding: 60 } } };
  expect(overall(s, "ar")).toBe(75);
});

test("systems are listed best first, and share a rank when their margins overlap", () => {
  const rows = ranked([sys("c", 80), sys("a", 90), sys("b", 89.5), sys("d", 60)], "ar", "overall");
  expect(rows.map((r) => r.system.id)).toEqual(["a", "b", "c", "d"]);
  // a and b are within each other's ±1: both first; c is clearly behind both: third
  expect(rows.map((r) => r.rank)).toEqual([1, 1, 3, 4]);
  expect(rows.map((r) => r.tied)).toEqual([true, true, false, false]);
});

test("sorting by one task orders by that task; ranks still come from the overall score", () => {
  const a = { ...sys("a", 90), scores: { ...sys("a", 90).scores, ar: { text: 50, tables: 95, order: 95, grounding: 95 } } };
  const rows = ranked([a, sys("b", 80)], "ar", "text");
  expect(rows.map((r) => r.system.id)).toEqual(["b", "a"]);
  expect(rows.find((r) => r.system.id === "a")!.rank).toBe(1);
});

test("the sample set has DocAI as ours, every other system named as a sample, four metrics", () => {
  expect(METRICS).toEqual(["text", "tables", "order", "grounding"]);
  const ours = SYSTEMS.filter((s) => s.kind === "ours");
  expect(ours.map((s) => s.name)).toEqual(["DocAI"]);
  expect(SYSTEMS.filter((s) => s.kind !== "ours").every((s) => s.name.startsWith("Sample "))).toBe(true);
});
