/** DocAI's element-type colours (docai-web lib/segment-colors.ts), so pages read the same as in the app. */
const SEGMENT_HEX: Record<string, string> = {
  text: "#3b82f6",
  title: "#ef4444",
  table: "#f97316",
  figure: "#22c55e",
  header: "#6366f1",
  footer: "#eab308",
  page_number: "#84cc16",
  logo: "#06b6d4",
  stamp: "#d946ef",
  signature: "#ec4899",
  caption: "#a3a3a3",
  chart: "#a3a3a3",
  formula: "#a3a3a3",
  code: "#a3a3a3",
  decoration: "#a3a3a3",
  other: "#a3a3a3",
};

const known = (type: string) => (Object.hasOwn(SEGMENT_HEX, type) ? type : "other");

export const segmentHex = (type: string) => SEGMENT_HEX[known(type)];

/** Corner tag on a page box: chunk number and wire type, e.g. "9.figure". */
export const segmentTag = (n: number, type: string) => `${n}.${known(type)}`;
