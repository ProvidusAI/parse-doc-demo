import { COPY } from "./copy";

// every English line has an Arabic one, so a change to the homepage can't leave a hole on /ar
const shape = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(shape) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v;

test("the Arabic homepage has every line the English one has", () => {
  const { kinds: _en, ...en } = COPY.en.script;
  const { kinds: _ar, ...ar } = COPY.ar.script;
  expect(shape({ ...COPY.ar, script: ar })).toEqual(shape({ ...COPY.en, script: en }));
  expect(Object.keys(COPY.ar.script.kinds)).toEqual(Object.keys(COPY.en.script.kinds));
  expect(COPY.ar.dir).toBe("rtl");
});
