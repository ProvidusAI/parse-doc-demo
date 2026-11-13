import { segmentHex, segmentTag } from "./segments";

test("type colours match DocAI, unknown types fall back to other", () => {
  expect(segmentHex("table")).toBe("#f97316");
  expect(segmentHex("title")).toBe("#ef4444");
  expect(segmentHex("mystery")).toBe(segmentHex("other"));
});

test("corner tag is chunk number and wire type, like DocAI", () => {
  expect(segmentTag(9, "figure")).toBe("9.figure");
  expect(segmentTag(3, "page_number")).toBe("3.page_number");
  expect(segmentTag(2, "mystery")).toBe("2.other");
});
